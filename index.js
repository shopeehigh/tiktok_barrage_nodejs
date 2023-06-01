// 测试
// window.onDouyinServer = function() {
//     new Barrage({ message: false })
// }

const Barrage = class {
    wsurl = "ws://127.0.0.1:9527"
    timer = null
    timeinterval = 10 * 1000 // 断线重连轮询间隔
    propsId = null
    chatDom = null
    roomJoinDom = null
    ws = null
    observer = null
    chatObserverrom = null
    option = {}
    event = {}
    eventRegirst = {}
    constructor(option = { message: true }) {
        this.option = option
        let { link, removePlay } = option
        if (link) {
            this.wsurl = link
        }
        if (removePlay) {
            document.querySelector('.basicPlayer').remove()
        }
        this.propsId = Object.keys(document.querySelector('.webcast-chatroom___list'))[1]
        this.chatDom = document.querySelector('.webcast-chatroom___items').children[0]
        this.roomJoinDom = document.querySelector('.webcast-chatroom___bottom-message')
        this.ws = new WebSocket(this.wsurl)
        this.ws.onclose = this.wsClose
        this.ws.onopen = () => {
            this.openWs()
        }
    }

    // 消息事件 , join, message, like, follow
    on(e, cb) {
        this.eventRegirst[e] = true
        this.event[e] = cb
    }
    openWs() {
        console.log(`[${new Date().toLocaleTimeString()}]`, '服务已经连接成功!')
        clearInterval(this.timer)
        this.runServer()
    }
    wsClose() {
        console.log('服务器断开')
        if (this.timer !== null) {
            return
        }
        this.observer && this.observer.disconnect();
        this.chatObserverrom && this.chatObserverrom.disconnect();
        this.timer = setInterval(() => {
            console.log('正在等待服务器启动..')
            this.ws = new WebSocket(wsurl);
            console.log('状态 ->', this.ws.readyState)
            setTimeout(() => {
                if (this.ws.readyState === 1) {
                    openWs()
                }
            }, 2000)

        }, this.timeinterval)
    }
    runServer() {
        let _this = this
        if (this.option.join) {
            this.observer = new MutationObserver((mutationsList) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length) {
                        let dom = mutation.addedNodes[0]
                        let user = dom[this.propsId].children.props.message.payload.user
                        let msg = {
                            ...this.getUser(user),
                            ...{ type: '进直播间' }
                        }
                        if (this.eventRegirst.join) {
                            this.event['join'](msg)
                        }
                        this.ws.send(JSON.stringify({ action: 'join', message: msg }));
                    }
                }
            });
            this.observer.observe(this.roomJoinDom, { childList: true });

        }

        this.chatObserverrom = new MutationObserver((mutationsList, observer) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    let dom = mutation.addedNodes[0]
                    let user = dom.props.message.payload.user
                    let msg = null
                    switch (dom.props.message.payload.message_type) {
                        case 1:
                            msg = {
                                ...this.getUser(user),
                                ...{ type: '聊天消息', msg_content: dom.props.message.payload.content }
                            }
                            if (this.eventRegirst.message) {
                                this.event['message'](msg)
                            }
                            break;
                        case 2:
                            msg = {
                                ...this.getUser(user),
                                ...{ type: '点赞消息' }
                            }
                            if (this.eventRegirst.like) {
                                this.event['like'](msg)
                            }
                            break;
                        case 4:
                            msg = {
                                ...this.getUser(user),
                                ...{ type: '关注消息' }
                            }
                            if (this.eventRegirst.follow) {
                                this.event['follow'](msg)
                            }
                            break;
                        case 5:
                            let gift = dom.props.message.payload.gift
                            msg = {
                                ...this.getUser(user),
                                ...{
                                    type: '礼物消息',
                                    gift_id: gift.id,
                                    gift_name: gift.name,
                                    gift_number: gift.num,
                                    gift_image: gift.image,
                                    gift_diamondCount: gift.diamond_count,
                                    gift_describe: gift.describe,
                                    msg_content: `${this.getUser(user).user_nickName}: 送给主播 ${gift.num}个${gift.name}`,
                                    isGift: true
                                }
                            }
                            if (this.eventRegirst.gift) {
                                this.event['gift'](msg)
                            }
                            break;
                    }
                    if (this.eventRegirst.message || this.eventRegirst.like || this.eventRegirst.follow || this.eventRegirst.gift) {
                        console.log(msg)
                    }
                }
            }
        });
        this.chatObserverrom.observe(this.chatDom, { childList: true })
    }

    getUser(user) {
        return {
            user_level: user.level,
            user_fansLevel: user.fans_level,
            user_id: user.id,
            user_nickName: user.nickname,
            user_avatar: user.head_img_url,
            user_gender: user.gender === 1 ? '男' : '女',
            user_isAdmin: user.is_admin,
            user_fansLightName: user.fans_light_name,
            user_levelImage: user.level_image
        }
    }
}
window.onDouyinServer = function() {
    new Barrage({ message: false })
}
