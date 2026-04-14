# 部署指南

## 准备
- Kubernetes 集群
- Traefik Ingress
- 域名: pm.oujun.work, api.oujun.work指向集群
- 镜像仓库: registry.cn-hangzhou.aliyuncs.com/yoyolab/aichats

## 步骤
1. 构建并 push 镜像 (Dockerfile.backend 和 frontend/Dockerfile)
2. 应用 K8s 资源: `kubectl apply -f backend-deployment.yaml,backend-service.yaml,frontend-deployment.yaml`
3. 验证: `kubectl get pods,svc,ingress`
4. 访问: https://pm.oujun.work

## 更新
`kubectl set image deployment/<name> <container>=<new-image>`

## 回滚
`kubectl rollout undo deployment/<name>`

## 故障排查
- Pod CrashLoopBackOff → `kubectl logs --previous`
- Service 无法访问 → `kubectl describe svc`
- Ingress 不生效 → 检查 Traefik 注解和 DNS