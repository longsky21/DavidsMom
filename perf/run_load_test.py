import argparse
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import requests


@dataclass
class Result:
    ok: bool
    status: int
    latency_ms: float


def request_once(method: str, url: str, *, headers: Dict[str, str], params: Optional[dict] = None) -> Result:
    start = time.perf_counter()
    try:
        resp = requests.request(method, url, headers=headers, params=params, timeout=10)
        latency_ms = (time.perf_counter() - start) * 1000
        return Result(ok=resp.status_code < 400, status=resp.status_code, latency_ms=latency_ms)
    except Exception:
        latency_ms = (time.perf_counter() - start) * 1000
        return Result(ok=False, status=0, latency_ms=latency_ms)


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    values_sorted = sorted(values)
    k = int(round((len(values_sorted) - 1) * p))
    return values_sorted[max(0, min(len(values_sorted) - 1, k))]


def run_scenario(
    *,
    name: str,
    method: str,
    url: str,
    headers: Dict[str, str],
    params: Optional[dict],
    concurrency: int,
    total_requests: int,
) -> Tuple[str, List[Result]]:
    results: List[Result] = []
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            executor.submit(request_once, method, url, headers=headers, params=params)
            for _ in range(total_requests)
        ]
        for f in as_completed(futures):
            results.append(f.result())
    return name, results


def summarize(name: str, results: List[Result]) -> None:
    latencies = [r.latency_ms for r in results]
    ok_count = sum(1 for r in results if r.ok)
    total = len(results)
    status_counts: Dict[int, int] = {}
    for r in results:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1

    print(f"\n== {name} ==")
    print(f"total={total} ok={ok_count} fail={total - ok_count} statuses={status_counts}")
    print(
        "latency_ms "
        f"avg={statistics.mean(latencies):.1f} "
        f"p50={percentile(latencies, 0.50):.1f} "
        f"p90={percentile(latencies, 0.90):.1f} "
        f"p99={percentile(latencies, 0.99):.1f} "
        f"max={max(latencies):.1f}"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--parent-token", required=True)
    parser.add_argument("--concurrency", type=int, default=20)
    parser.add_argument("--requests", type=int, default=200)
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    parent_headers = {"Authorization": f"Bearer {args.parent_token}"}

    scenarios = [
        dict(
            name="media_report_summary_week_video",
            method="GET",
            url=f"{base}/api/media/report/summary",
            headers=parent_headers,
            params={"period": "week", "module": "video"},
        ),
        dict(
            name="media_report_days_week_video",
            method="GET",
            url=f"{base}/api/media/report/days",
            headers=parent_headers,
            params={"period": "week", "module": "video"},
        ),
    ]

    for s in scenarios:
        name, results = run_scenario(
            name=s["name"],
            method=s["method"],
            url=s["url"],
            headers=s["headers"],
            params=s["params"],
            concurrency=args.concurrency,
            total_requests=args.requests,
        )
        summarize(name, results)


if __name__ == "__main__":
    main()

