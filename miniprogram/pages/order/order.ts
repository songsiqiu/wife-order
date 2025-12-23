// order.ts

/** 生成唯一ID */
const generateId = () => Date.now() + Math.random();

/** 贝塞尔曲线计算点 */
const bezierPoint = (t: number, p0: number, p1: number, p2: number): number =>
  Math.pow(1 - t, 2) * p0 + 2 * (1 - t) * t * p1 + Math.pow(t, 2) * p2;

/** 美食数据配置 */
const FOOD_DATA: Food[] = [
  {
    id: 1,
    name: '麻辣火锅',
    description: '特辣牛肉片，配以时令蔬菜，热气蒸腾',
    image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=200',
    category: 'serious'
  },
  {
    id: 2,
    name: '珍珠奶茶',
    description: '黑糖珍珠奶茶，半糖去冰，口感丝滑',
    image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=200',
    category: 'midnight'
  },
  {
    id: 3,
    name: '芝士意面',
    description: '意式肉酱，加倍芝士，浓郁香气',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200',
    category: 'serious'
  },
  {
    id: 4,
    name: '草莓蛋糕',
    description: '新鲜草莓切片，动物奶油，入口即化',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200',
    category: 'dessert'
  },
  {
    id: 5,
    name: '深夜烤串',
    description: '香辣烤肉串，孜然风味，宵夜首选',
    image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=200',
    category: 'midnight'
  }
];

/** 分类数据配置 */
const CATEGORY_DATA: Category[] = [
  { id: 'all', name: '全部' },
  { id: 'midnight', name: '夜宵' },
  { id: 'serious', name: '正餐' },
  { id: 'dessert', name: '甜点' }
];

/** 存储定时器ID，用于组件销毁时清理 */
let animationTimers: ReturnType<typeof setTimeout>[] = [];
let cookingTimers: ReturnType<typeof setTimeout>[] = [];

Component({
  data: {
    currentTab: 'order' as 'order' | 'making',
    currentCategory: 'all',
    categories: CATEGORY_DATA,
    foods: FOOD_DATA,
    filteredFoods: [] as Food[],
    totalCount: 0,
    flyBalls: [] as FlyBall[],
    cartBounce: false,
    currentOrderItems: [] as OrderItem[],
    makingOrders: [] as MakingOrder[],
    cartX: 0,
    cartY: 0,
    isRecording: false,
    voiceCancel: false,
    voiceStartY: 0,
    // 历史订单数据
    historyOrders: [
      { id: 1, month: '12月', day: '24', name: '麻辣火锅', emoji: '🍲' },
      { id: 2, month: '12月', day: '21', name: '珍珠奶茶', emoji: '🧋' },
      { id: 3, month: '12月', day: '18', name: '草莓蛋糕', emoji: '🍰' },
      { id: 4, month: '12月', day: '15', name: '深夜烤串', emoji: '🍢' }
    ]
  },

  lifetimes: {
    attached() {
      // 重置定时器数组
      animationTimers = [];
      cookingTimers = [];
      
      this.filterFoods();
      const timer = setTimeout(() => this.getCartPosition(), 300);
      animationTimers.push(timer);
    },

    detached() {
      // 清理所有动画定时器
      animationTimers.forEach(timer => clearTimeout(timer));
      cookingTimers.forEach(timer => clearTimeout(timer));
      animationTimers = [];
      cookingTimers = [];
    }
  },

  methods: {
    /** 切换 Tab */
    switchTab(e: WechatMiniprogram.TouchEvent) {
      const tab = e.currentTarget.dataset.tab as 'order' | 'making';
      this.setData({ currentTab: tab });
      if (tab === 'order') {
        const timer = setTimeout(() => this.getCartPosition(), 100);
        animationTimers.push(timer);
      }
    },

    /** 获取购物车位置 */
    getCartPosition() {
      const query = this.createSelectorQuery();
      query.select('.total-count').boundingClientRect((rect) => {
        if (rect) {
          this.setData({
            cartX: rect.left + rect.width / 2 - 15,
            cartY: rect.top + rect.height / 2 - 15
          });
        }
      }).exec();
    },

    /** 分类切换 */
    onCategoryChange(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id as string;
      this.setData({ currentCategory: id });
      this.filterFoods();
    },

    /** 过滤美食列表 */
    filterFoods() {
      const { foods, currentCategory } = this.data;
      const filtered = currentCategory === 'all'
        ? foods
        : foods.filter(f => f.category === currentCategory);
      this.setData({ filteredFoods: filtered });
    },

    /** 添加商品（带飞行动画） */
    onAddItem(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id as number;
      const image = e.currentTarget.dataset.image as string;
      const touches = e.touches || [];
      const changedTouches = e.changedTouches || [];
      const touch = touches[0] || changedTouches[0];

      if (!touch) {
        this.addToCart(id);
        return;
      }

      const startX = touch.clientX - 15;
      const startY = touch.clientY - 15;
      const { cartX, cartY } = this.data;

      // 控制点：在起点和终点的中间上方，形成自然的抛物线
      const controlX = (startX + cartX) / 2;
      const controlY = Math.min(startY, cartY) - 100;

      const flyId = generateId();
      const newBall: FlyBall = {
        id: flyId,
        image,
        x: startX,
        y: startY,
        opacity: 1,
        scale: 1
      };

      const flyBalls = [...this.data.flyBalls, newBall];
      this.setData({ flyBalls });

      // 贝塞尔曲线动画
      this.animateBezier(flyId, startX, startY, controlX, controlY, cartX, cartY, id);
    },

    /** 贝塞尔曲线动画 */
    animateBezier(
      flyId: number,
      startX: number, startY: number,
      ctrlX: number, ctrlY: number,
      endX: number, endY: number,
      foodId: number
    ) {
      const duration = 500; // 动画时长 ms
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = progress;

        // 使用封装的贝塞尔曲线函数
        const x = bezierPoint(t, startX, ctrlX, endX);
        const y = bezierPoint(t, startY, ctrlY, endY);

        // 缩放和透明度
        const scale = 1 - progress * 0.6;
        const opacity = 1 - progress * 0.3;

        // 更新位置
        const ballIndex = this.data.flyBalls.findIndex(b => b.id === flyId);
        if (ballIndex !== -1) {
          this.setData({
            [`flyBalls[${ballIndex}].x`]: x,
            [`flyBalls[${ballIndex}].y`]: y,
            [`flyBalls[${ballIndex}].scale`]: scale,
            [`flyBalls[${ballIndex}].opacity`]: opacity
          });
        }

        if (progress < 1) {
          const timer = setTimeout(animate, 16); // ~60fps
          animationTimers.push(timer);
        } else {
          // 动画结束
          this.addToCart(foodId);
          this.triggerCartBounce();
          const remainingBalls = this.data.flyBalls.filter(ball => ball.id !== flyId);
          this.setData({ flyBalls: remainingBalls });
        }
      };

      animate();
    },

    /** 添加到购物车 */
    addToCart(foodId: number) {
      const food = this.data.foods.find(f => f.id === foodId);
      if (!food) return;

      const currentOrderItems = [...this.data.currentOrderItems];
      const existingItem = currentOrderItems.find(item => item.id === foodId);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        currentOrderItems.push({
          id: food.id,
          name: food.name,
          image: food.image,
          quantity: 1,
          done: false
        });
      }

      this.setData({
        currentOrderItems,
        totalCount: this.data.totalCount + 1
      });
    },

    /** 触发购物车弹跳动画 */
    triggerCartBounce() {
      this.setData({ cartBounce: true });
      const timer = setTimeout(() => {
        this.setData({ cartBounce: false });
      }, 400);
      animationTimers.push(timer);
    },

    /** 提交订单 */
    onSubmit() {
      const { totalCount, currentOrderItems } = this.data;
      if (totalCount === 0) {
        wx.showToast({ title: '请先选择美食哦~', icon: 'none' });
        return;
      }

      // 创建新订单
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const newOrder: MakingOrder = {
        id: generateId(),
        time: timeStr,
        items: currentOrderItems.map(item => ({ ...item, done: false })),
        allDone: false
      };

      const makingOrders = [newOrder, ...this.data.makingOrders];

      this.setData({
        makingOrders,
        currentOrderItems: [],
        totalCount: 0,
        currentTab: 'making'
      });

      wx.showToast({ title: '下单成功! 💕', icon: 'success' });

      // 模拟制作过程
      this.simulateCooking(newOrder.id);
    },

    /** 模拟烹饪过程 - 使用 orderId 而非 index 避免索引失效 */
    simulateCooking(orderId: number) {
      const order = this.data.makingOrders.find(o => o.id === orderId);
      if (!order) return;

      order.items.forEach((_, itemIndex) => {
        const timer = setTimeout(() => {
          // 每次都重新查找 orderIndex，确保索引正确
          const currentOrderIndex = this.data.makingOrders.findIndex(o => o.id === orderId);
          if (currentOrderIndex === -1) return;

          const key = `makingOrders[${currentOrderIndex}].items[${itemIndex}].done`;
          this.setData({ [key]: true });

          // 检查是否全部完成
          const updatedOrder = this.data.makingOrders[currentOrderIndex];
          if (updatedOrder && updatedOrder.items.every(item => item.done)) {
            this.setData({ [`makingOrders[${currentOrderIndex}].allDone`]: true });
          }
        }, (itemIndex + 1) * 1500);

        cookingTimers.push(timer);
      });
    },

    /** 语音开始 */
    onVoiceStart(e: WechatMiniprogram.TouchEvent) {
      const touches = e.touches || [];
      const touch = touches[0];
      this.setData({ 
        isRecording: true,
        voiceStartY: touch ? touch.clientY : 0
      });
      wx.vibrateShort({ type: 'medium' });
      // TODO: 实际项目中这里调用录音 API
    },

    /** 语音移动检测 */
    onVoiceMove(e: WechatMiniprogram.TouchEvent) {
      if (!this.data.isRecording) return;
      
      const touches = e.touches || [];
      const touch = touches[0];
      if (!touch) return;
      
      const startY = this.data.voiceStartY || 0;
      const moveY = touch.clientY;
      const distance = startY - moveY;
      
      // 上滑超过 80px 时进入取消状态
      const shouldCancel = distance > 80;
      
      if (shouldCancel !== this.data.voiceCancel) {
        this.setData({ voiceCancel: shouldCancel });
        if (shouldCancel) {
          wx.vibrateShort({ type: 'light' });
        }
      }
    },

    /** 语音结束 */
    onVoiceEnd() {
      if (!this.data.isRecording) return;
      const cancelled = this.data.voiceCancel;
      this.setData({ isRecording: false, voiceCancel: false, voiceStartY: 0 });
      wx.vibrateShort({ type: 'light' });
      
      if (cancelled) {
        wx.showToast({ title: '已取消', icon: 'none' });
      } else {
        // TODO: 实际项目中这里停止录音并发送
        wx.showToast({ title: '语音已发送 💕', icon: 'success' });
      }
    },

    /** 取消语音 */
    onVoiceCancel() {
      this.setData({ voiceCancel: true, isRecording: false, voiceStartY: 0 });
      wx.vibrateShort({ type: 'heavy' });
      wx.showToast({ title: '已取消', icon: 'none' });
    },

    /** 阻止遮罩层滚动 */
    preventMove() {
      // 空方法，用于阻止触摸穿透
    },

    /** 选择历史订单 */
    onSelectHistory(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id;
      const historyItem = this.data.historyOrders.find(h => h.id === id);
      if (!historyItem) return;

      // 添加到当前订单
      const food = this.data.foods.find(f => f.name === historyItem.name);
      if (food) {
        this.addToCart(food.id);
        wx.showToast({ title: `已添加 ${historyItem.name}`, icon: 'none' });
        this.setData({ currentTab: 'order' });
      } else {
        wx.showToast({ title: `已选择 ${historyItem.name}`, icon: 'success' });
      }
    }
  }
});
