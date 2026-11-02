# 本地启动入口

项目根目录 `G:\work\FsGame\Project\mxzg`。脚本使用自身位置定位工程，不要求先切工作目录。

- `start-remake-backend.bat`：启动或复用本项目新后端，默认 `127.0.0.1:18080`。
- `status-remake-backend.bat`：检查服务归属和状态。
- `restart-remake-backend.bat`：核对并重启当前仓库服务。
- `stop-remake-backend.bat`：仅停止已核对属于本仓库的服务，不清库。
- `build-remake-h5.bat` / `start-remake-h5.bat`：保留的按需操作入口；当前默认只用 Creator 预览，不自动构建。

Creator 打开 `client/assets/scenes/Remake.scene`。开发登录、选服、主城及已接入功能全部调用新 HTTP API。

旧 Java 8 服务、WebSocket 桥及对应启停脚本已经删除。详细行为见 [本机工作流](../docs/local-remake-workflow.md)。
