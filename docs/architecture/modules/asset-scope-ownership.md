<!-- architecture-module: asset-scope-ownership -->

# Asset Hub Scope 与媒体所有权

## 为什么是这样

Asset Hub 是用户级可复用角色、场景和道具库；Project 内的任何人物、场景、道具、参考图和生成媒体
都统一为 WorkspaceResource。两者通过显式导入建立 Lineage，但不存在第二套项目资产实体。

对象存在不等于有权读取。publicId、storageKey 和签名 URL 都只是定位手段，授权由 owner 关系证明。

## 不变量

- **ASO-01 — Asset Hub 只有 user scope。** 全局资产必须属于当前用户，kind 必须与持久记录一致；
  Project id 不是 Hub 资产的 ownership。
- **ASO-02 — 子实体不能悬空。** 外观、图片/渲染变体只有在属于已验证的 parent 时才有效。
- **ASO-03 — 共享 resolver 唯一裁决。** route 鉴权不是资产证明；读改、更新、选择、回退和删除都先
  调用同一个 scope/ownership resolver。
- **ASO-04 — 不泄露存在性。** missing、foreign、wrong-kind 与 cross-parent 在副作用前统一返回
  未找到。
- **ASO-05 — 导入 Project 生成 WorkspaceResource。** Hub 资产进入项目必须显式选择 Placement，由
  Resource service 创建文件或媒体引用与 Lineage；不得复制成项目资产表、按名称合并或自动改写原
  Hub 资产。
- **ASO-06 — 媒体关系拥有访问权，不拥有物理回收权。** 读取由 active owner 关系证明。删除关系不能
  直接删除共享对象，物理 GC 只能在穷尽关系 registry 后执行。媒体响应缓存只允许 private 且不可变
  语义，禁止让共享或 CDN 缓存成为第二分发面；授权检查仍在每次未命中请求上执行。
- **ASO-07 — 外部下载受 SSRF 边界。** 自有媒体先完成 owner 投影，再由统一出站入口逐跳验证
  DNS/socket/redirect；内部 hostname 或签名 URL 不能成为私网 allowlist。
- **ASO-08 — 顶层删除唯一。** Hub 顶层实体走 Hub 删除入口，变体使用精确 parent/variant identity；
  Project Resource 删除走 WorkspaceResource 契约，不走 Hub service。
- **ASO-09 — 存储协议与对象 writer 唯一。** 所有部署只使用 S3 兼容协议与同一个对象写入口；
  自托管编排唯一初始化私有 MinIO 桶，Cloud 绑定预建 HTTPS 桶。应用不得回退本地目录、暴露私有
  endpoint 或在媒体调用方创建桶；浏览器交付与 Provider wire 投影都必须复用同一 owner 事实。
- **ASO-10 — Project 删除先关闭执行。** 删除前在同一事务确认没有非终态 Task、活跃 Turn 或待恢复
  交互；数据库 cascade 不能替代外部执行取消。
- **ASO-11 — 库内图片展示与授权消费同一关联。** 素材实体的当前、候选和历史图片值是库内媒体关联
  权威；独立媒体外键不再解释另一份关联。访问必须证明该精确媒体仍由当前用户的实体引用，模糊匹配
  不能授权。把已有私有媒体关联到新实体之前，必须先证明调用者原本就拥有读取权，不能用新建实体
  自行授予访问权。

## 权威入口

| 动作 | 唯一入口 |
| --- | --- |
| Hub owner/kind/variant 裁决 | `src/lib/assets/services/asset-scope-ownership.ts` |
| Hub 变更与删除 | `src/lib/assets/services/asset-actions.ts` + Hub Operation/routes |
| Project 创作资产 | `src/lib/workspace-resource/**` |
| 私有媒体读取与签名 | `src/lib/media/storage-access-policy.ts`、`outbound-owned-media.ts` |
| 外部媒体下载 | `src/lib/media/outbound-fetch.ts` |
| 对象存储 | `src/lib/storage/**` |

## 踩过的坑

- 详见 [Provider Gateway](provider-gateway.md) 的 SSRF 条目：首轮媒体下载防线只在一个入口做
  "DNS 预检 + 普通 fetch"，实际连接会再次解析，且 Provider 结果下载完全绕过该 policy。现在所有
  主动下载收敛到同一出口（ASO-07）。
