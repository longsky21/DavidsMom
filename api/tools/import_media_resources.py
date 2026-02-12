import argparse
import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional, Type

from sqlalchemy.orm import Session

from ..database import Base, SessionLocal, engine
from .. import models


def normalize_media_type(raw: str) -> Optional[str]:
    value = (raw or "").strip().lower()
    if value in {"video", "mp4", "视频"}:
        return "video"
    if value in {"audio", "mp3", "音频"}:
        return "audio"
    if "视频" in value:
        return "video"
    if "音频" in value:
        return "audio"
    return None


def infer_location_type(url: str) -> str:
    value = (url or "").strip().lower()
    if value.startswith("http://") or value.startswith("https://"):
        return "remote"
    return "local"


def build_pair_key(directory: Optional[str], filename: str) -> str:
    dir_part = (directory or "").strip()
    name = (filename or "").strip()
    if "." in name:
        name = name.rsplit(".", 1)[0]
    normalized = "".join(ch.lower() for ch in name if not ch.isspace())
    return f"{dir_part}::{normalized}".strip(":")


def parse_int(value: str) -> Optional[int]:
    try:
        if value is None:
            return None
        text = str(value).strip()
        if text == "":
            return None
        return int(float(text))
    except Exception:
        return None


def parse_float(value: str) -> Optional[float]:
    try:
        if value is None:
            return None
        text = str(value).strip()
        if text == "":
            return None
        return float(text)
    except Exception:
        return None


@dataclass
class ImportStats:
    created: int = 0
    updated: int = 0
    skipped: int = 0


def upsert_resource(
    db,
    *,
    directory: Optional[str],
    filename: str,
    media_type: str,
    size_mb: Optional[float],
    duration_seconds: Optional[int],
    url: str,
    source_channel: str,
    difficulty_level: int,
    location_type: str,
    pair_key: Optional[str],
    dry_run: bool,
) -> str:
    existing = (
        db.query(models.MediaResource)
        .filter(models.MediaResource.source_channel == source_channel, models.MediaResource.url == url)
        .first()
    )
    if not existing:
        existing = (
            db.query(models.MediaResource)
            .filter(
                models.MediaResource.directory == directory,
                models.MediaResource.filename == filename,
                models.MediaResource.media_type == media_type,
            )
            .first()
        )

    if not existing:
        if not dry_run:
            resource = models.MediaResource(
                directory=directory,
                filename=filename,
                media_type=media_type,
                size_mb=size_mb,
                duration_seconds=duration_seconds,
                url=url,
                source_channel=source_channel,
                difficulty_level=difficulty_level,
                location_type=location_type,
                pair_key=pair_key,
            )
            db.add(resource)
            db.flush()
        return "created"

    updated = False
    for field, new_value in {
        "directory": directory,
        "filename": filename,
        "media_type": media_type,
        "size_mb": size_mb,
        "duration_seconds": duration_seconds,
        "url": url,
        "source_channel": source_channel,
        "difficulty_level": difficulty_level,
        "location_type": location_type,
        "pair_key": pair_key,
    }.items():
        if getattr(existing, field) != new_value and new_value is not None:
            setattr(existing, field, new_value)
            updated = True

    if updated and not dry_run:
        db.add(existing)
    return "updated" if updated else "skipped"


def import_csv(
    csv_path: Path,
    *,
    dry_run: bool,
    bind_engine=engine,
    session_factory: Callable[[], Session] = SessionLocal,
) -> ImportStats:
    Base.metadata.create_all(bind=bind_engine)
    stats = ImportStats()

    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        with session_factory() as db:
            for row in reader:
                directory = (row.get("目录") or row.get("directory") or "").strip() or None
                filename = (row.get("文件名") or row.get("filename") or "").strip()
                raw_media_type = row.get("文件类型") or row.get("media_type") or ""
                media_type = normalize_media_type(raw_media_type)
                url = (row.get("URL") or row.get("url") or "").strip()

                if not filename or not media_type or not url:
                    stats.skipped += 1
                    continue

                size_mb = parse_float(row.get("文件大小(MB)") or row.get("size_mb"))
                duration_seconds = parse_int(row.get("时长") or row.get("duration_seconds"))

                source_channel = (row.get("数据来源渠道") or row.get("source_channel") or "diegodad.com").strip()
                difficulty_level = parse_int(row.get("难度级别") or row.get("difficulty_level")) or 1
                difficulty_level = max(1, min(4, difficulty_level))

                location_type = (row.get("location_type") or "").strip().lower() or infer_location_type(url)
                if location_type not in {"remote", "local"}:
                    location_type = infer_location_type(url)

                pair_key = build_pair_key(directory, filename)

                result = upsert_resource(
                    db,
                    directory=directory,
                    filename=filename,
                    media_type=media_type,
                    size_mb=size_mb,
                    duration_seconds=duration_seconds,
                    url=url,
                    source_channel=source_channel,
                    difficulty_level=difficulty_level,
                    location_type=location_type,
                    pair_key=pair_key,
                    dry_run=dry_run,
                )
                if result == "created":
                    stats.created += 1
                elif result == "updated":
                    stats.updated += 1
                else:
                    stats.skipped += 1

            if not dry_run:
                db.commit()

    return stats


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--csv",
        dest="csv_path",
        default=str(Path(__file__).resolve().parents[2] / "uploads" / "all_video_audio.csv"),
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    csv_path = Path(args.csv_path)
    if not csv_path.exists():
        raise SystemExit(f"CSV not found: {csv_path}")

    stats = import_csv(csv_path, dry_run=args.dry_run)
    mode = "DRY_RUN" if args.dry_run else "COMMIT"
    print(
        f"[{mode}] created={stats.created} updated={stats.updated} skipped={stats.skipped} csv={csv_path}"
    )


if __name__ == "__main__":
    main()
