# 資安政策

## 回報漏洞

發現安全問題時，請不要公開開 Issue，改寄信到【聯絡 Email】，說明重現步驟與影響範圍。我們會在 7 天內回覆。

## 自動化檢查

| 工具 | 時機 | 設定檔 |
|---|---|---|
| 型別檢查、Lint、`npm audit` | 每次推送、PR | `.github/workflows/ci.yml` |
| 資安自動化測試（22 項） | 每次推送、PR；本機 `npm run test:security` | `tests/security.test.mjs` |
| OWASP ZAP 基本掃描 | 每次推送、PR | `.github/workflows/ci.yml`、`.zap/rules.tsv` |
| CodeQL 靜態分析 | 每次推送、PR、每週一 | `.github/workflows/codeql.yml` |
| Dependabot 套件更新 | 每週 | `.github/dependabot.yml` |
| Secret scanning ＋ push protection | 每次推送 | GitHub repo 設定（Settings → Code security） |

完整的檢測結果與已知取捨見 [docs/security-report.md](docs/security-report.md)。
