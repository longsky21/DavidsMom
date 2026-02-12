# 性能测试报告（媒体模块）

## 目标
- 覆盖核心高频接口：媒体报表查询、按日汇总查询
- 验证在一定并发下，接口仍保持可接受延迟与成功率

## 测试环境
- 本地或预发环境 FastAPI 服务（建议与生产同配置的 MySQL）
- 使用家长 token 访问报表接口

## 测试脚本
- 脚本位置：perf/run_load_test.py
- 依赖：仅 requests（项目已包含）

运行示例：

```bash
python perf/run_load_test.py \
  --base-url http://127.0.0.1:8000 \
  --parent-token "<PARENT_TOKEN>" \
  --concurrency 20 \
  --requests 200
```

## 指标
- 成功率（HTTP < 400）
- 延迟：avg / p50 / p90 / p99 / max（毫秒）

## 结果记录（模板）
将脚本输出粘贴到此处：

```text
== media_report_summary_week_video ==
...

== media_report_days_week_video ==
...
```

## 结论与建议
- 若 p99 明显升高：优先检查 DB 索引（child_id/module/started_at）与聚合查询成本
- 若失败率升高：检查连接池、MySQL 最大连接数与服务端超时配置

