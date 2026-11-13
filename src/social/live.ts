/**
 * 好友实时同游：用公共 MQTT 房间通道传输岛屿快照与访客位置。
 * 房间码就是主题的一部分，不需要账号或自建服务器。
 */
import mqtt from 'mqtt';
import type { AvatarConfig } from '../core/types';
import type { IslandSnapshot } from './friendcode';

const BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_ROOT = 'paradise-isle/coop/';

export interface LiveSnapshot {
  type: 'snap';
  snap: IslandSnapshot;
  from?: 'host' | 'guest';
}
export interface LiveMove {
  type: 'move';
  x: number;
  y: number;
  name: string;
  avatar: AvatarConfig;
  from?: 'host' | 'guest';
}
export interface LiveChat {
  type: 'chat';
  text: string;
  name: string;
  from?: 'host' | 'guest';
}
export interface LiveHello {
  type: 'hello';
  name: string;
  avatar: AvatarConfig;
  from?: 'host' | 'guest';
}
export type LiveMessage = LiveSnapshot | LiveMove | LiveChat | LiveHello;

export interface LiveHost {
  code: string;
  broadcast: (msg: LiveMessage) => void;
  stop: () => void;
}

export interface LiveGuest {
  send: (msg: LiveMessage) => void;
  stop: () => void;
}

function randomCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `pi-${out}`;
}

function parse(data: Uint8Array | string): LiveMessage | null {
  try {
    const msg = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data));
    if (!msg || typeof msg !== 'object' || typeof (msg as LiveMessage).type !== 'string') return null;
    return msg as LiveMessage;
  } catch {
    return null;
  }
}

function connect(): ReturnType<typeof mqtt.connect> {
  return mqtt.connect(BROKER, {
    clientId: `pi-${Math.random().toString(36).slice(2, 10)}`,
    clean: true,
    reconnectPeriod: 0,
    connectTimeout: 12000,
    keepalive: 30,
  });
}

/** 开房：只创建房间码并订阅主题，等朋友发 hello。 */
export function createLiveHost(
  onMessage: (msg: LiveMessage) => void,
  onGuest: (name: string) => void,
): Promise<LiveHost> {
  return new Promise((resolve, reject) => {
    const code = randomCode();
    const topic = TOPIC_ROOT + code;
    const client = connect();
    let settled = false;
    const timer = window.setTimeout(() => fail(new Error('timeout')), 15000);
    const fail = (err: unknown): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      client.end(true);
      reject(err);
    };
    client.on('error', fail);
    client.on('connect', () => {
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          fail(err);
          return;
        }
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({
          code,
          broadcast: (msg) => client.publish(topic, JSON.stringify({ ...msg, from: 'host' })),
          stop: () => client.end(true),
        });
      });
    });
    client.on('message', (_topic, payload) => {
      const msg = parse(payload);
      if (!msg || msg.from !== 'guest') return;
      if (msg.type === 'hello') onGuest(msg.name);
      onMessage(msg);
    });
  });
}

/** 加入房间：订阅主题、发 hello，收到房主第一份快照后才算成功。 */
export function joinLive(
  code: string,
  onMessage: (msg: LiveMessage) => void,
  hello: { name: string; avatar: AvatarConfig },
  onClose?: () => void,
): Promise<LiveGuest> {
  return new Promise((resolve, reject) => {
    const clean = code.trim().toLowerCase();
    if (!clean) {
      reject(new Error('empty'));
      return;
    }
    const topic = TOPIC_ROOT + clean;
    const client = connect();
    let settled = false;
    let gotSnap = false;
    const timer = window.setTimeout(() => fail(new Error('timeout')), 15000);
    const fail = (err: unknown): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      client.end(true);
      reject(err);
    };
    const send = (msg: LiveMessage): void => {
      client.publish(topic, JSON.stringify({ ...msg, from: 'guest' }));
    };
    client.on('error', fail);
    client.on('close', () => {
      if (gotSnap) onClose?.();
    });
    client.on('connect', () => {
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          fail(err);
          return;
        }
        // hello 让房主立刻回一份快照
        send({ type: 'hello', name: hello.name, avatar: hello.avatar });
      });
    });
    client.on('message', (_topic, payload) => {
      const msg = parse(payload);
      if (!msg || msg.from !== 'host') return;
      if (msg.type === 'snap' && !settled) {
        settled = true;
        gotSnap = true;
        window.clearTimeout(timer);
        resolve({ send, stop: () => client.end(true) });
      }
      onMessage(msg);
    });
  });
}
