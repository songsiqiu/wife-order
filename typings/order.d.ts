/**
 * 点餐相关类型定义
 */

/** 美食分类 */
interface Category {
  id: string;
  name: string;
}

/** 美食信息 */
interface Food {
  id: number;
  name: string;
  description: string;
  image: string;
  category: string;
}

/** 飞行动画球 */
interface FlyBall {
  id: number;
  image: string;
  x: number;
  y: number;
  opacity: number;
  scale: number;
}

/** 订单项 */
interface OrderItem {
  id: number;
  name: string;
  image: string;
  quantity: number;
  done: boolean;
}

/** 制作中的订单 */
interface MakingOrder {
  id: number;
  time: string;
  items: OrderItem[];
  allDone: boolean;
}
