type Connection = {
  userId: string;
  ws: any; // WebSocket 实例
  lastPong: number;
};

class WebSocketManager {
  private connections: Map<string, Connection[]> = new Map();

  /**
   * 注册连接
   */
  register(userId: string, ws: any) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }
    this.connections.get(userId)!.push({
      userId,
      ws,
      lastPong: Date.now(),
    });

    console.log(`[WS] User ${userId} connected. Total connections: ${this.getTotalConnections()}`);
  }

  /**
   * 注销连接
   */
  unregister(userId: string, ws: any) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const index = userConnections.findIndex(c => c.ws === ws);
      if (index > -1) {
        userConnections.splice(index, 1);
      }
      if (userConnections.length === 0) {
        this.connections.delete(userId);
      }
    }
    console.log(`[WS] User ${userId} disconnected. Total connections: ${this.getTotalConnections()}`);
  }

  /**
   * 更新心跳时间
   */
  updatePong(userId: string, ws: any) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const conn = userConnections.find(c => c.ws === ws);
      if (conn) {
        conn.lastPong = Date.now();
      }
    }
  }

  /**
   * 检查超时连接 (心跳检测)
   */
  checkTimeouts(timeoutMs: number = 60000) {
    const now = Date.now();
    const timedOut: { userId: string; ws: any }[] = [];

    this.connections.forEach((conns, userId) => {
      conns.forEach(conn => {
        if (now - conn.lastPong > timeoutMs) {
          timedOut.push({ userId, ws: conn.ws });
        }
      });
    });

    timedOut.forEach(({ userId, ws }) => {
      console.log(`[WS] Connection timeout: ${userId}`);
      this.unregister(userId, ws);
      try {
        ws.terminate();
      } catch (e) {
        // ignore
      }
    });

    return timedOut.length;
  }

  /**
   * 广播消息给指定用户
   */
  sendToUser(userId: string, message: any) {
    const userConnections = this.connections.get(userId);
    if (!userConnences || userConnections.length === 0) {
      return false;
    }

    const payload = JSON.stringify(message);
    userConnections.forEach(conn => {
      if (conn.ws.readyState === 1) { // OPEN
        conn.ws.send(payload);
      }
    });
    return true;
  }

  /**
   * 广播消息给除发送者外的所有连接的用户
   */
  broadcastToUsers(excludeUserId: string, message: any) {
    const payload = JSON.stringify(message);
    this.connections.forEach((conns, userId) => {
      if (userId !== excludeUserId) {
        conns.forEach(conn => {
          if (conn.ws.readyState === 1) {
            conn.ws.send(payload);
          }
        });
      }
    });
  }

  /**
   * 获取总连接数
   */
  getTotalConnections(): number {
    let total = 0;
    this.connections.forEach(conns => {
      total += conns.length;
    });
    return total;
  }

  /**
   * 获取在线用户数
   */
  getOnlineUserCount(): number {
    return this.connections.size;
  }

  /**
   * 判断用户是否在线
   */
  isOnline(userId: string): boolean {
    return this.connections.has(userId) && this.connections.get(userId)!.length > 0;
  }
}

export const wsManager = new WebSocketManager();