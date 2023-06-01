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
        this.ws.onclose = this.wsClose.bind(this)
        this.ws.onopen = this.openWs.bind(this)
    }

    // 消息事件: join, like, follow, share, comment, gift
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
            this.ws = new WebSocket(this.wsurl);
            console.log('状态 ->', this.ws.readyState)
            setTimeout(() => {
                if (this.ws.readyState === 1) {
                    this.openWs()
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
                            type: 'join',
                            msgId: mutation.target[this.propsId].children.props.message.payload.id,
                            user: _this.getUser(user),
                            content: `${user.nickname} 来了`,
                            roomId: _this.getRoomId()
                        }
                        if (_this.eventRegirst.join) {
                            _this.event['join'](msg)
                        }
                        _this.ws.send(JSON.stringify({ action: 'join', message: msg }));
                    }
                }
            });
            this.observer.observe(this.roomJoinDom, { childList: true });

        }

        this.chatObserverrom = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    let b = mutation.addedNodes[0]
                    if (b[this.propsId].children.props.message) {
                        let message = this.messageParse(b)
                        if (message) {
                            switch (message.common.method) {
                                case 'WebcastLikeMessage':
                                    let likeMsg = {
                                        type: 'like',
                                        msgId: message.id,
                                        user: _this.getUser(message.payload.user),
                                        content: message.common.describe,
                                        roomId: _this.getRoomId(),
                                        count: parseInt(message.comboCount),
                                        total: parseInt(message.payload.user.followerCount)
                                    }
                                    if (_this.eventRegirst.like) {
                                        _this.event['like'](likeMsg)
                                    }
                                    _this.ws.send(JSON.stringify({ action: 'like', message: likeMsg }));
                                    break;

                                case 'WebcastMemberMessage':
                                    let joinMsg = {
                                        type: 'join',
                                        msgId: message.id,
                                        user: _this.getUser(message.payload.user),
                                        content: `${message.payload.user.nickname} 来了`,
                                        roomId: _this.getRoomId(),
                                        currentCount: message.payload.currentCount
                                    }
                                    if (_this.eventRegirst.join) {
                                        _this.event['join'](joinMsg)
                                    }
                                    _this.ws.send(JSON.stringify({ action: 'join', message: joinMsg }));
                                    break;

                                case 'WebcastFollowMessage':
                                    let followMsg = {
                                        type: 'follow',
                                        msgId: message.id,
                                        user: _this.getUser(message.payload.user),
                                        content: message.common.describe,
                                        roomId: _this.getRoomId()
                                    }
                                    if (_this.eventRegirst.follow) {
                                        _this.event['follow'](followMsg)
                                    }
                                    _this.ws.send(JSON.stringify({ action: 'follow', message: followMsg }));
                                    break;

                                case 'WebcastShareMessage':
                                    let shareMsg = {
                                        type: 'share',
                                        msgId: message.id,
                                        user: _this.getUser(message.payload.user),
                                        content: message.common.describe,
                                        roomId: _this.getRoomId(),
                                        shareType: message.payload.shareType
                                    }
                                    if (_this.eventRegirst.share) {
                                        _this.event['share'](shareMsg)
                                    }
                                    _this.ws.send(JSON.stringify({ action: 'share', message: shareMsg }));
                                    break;

                                case 'WebcastChatMessage':
                                    let commentMsg = {
                                        type: 'comment',
                                        msgId: message.id,
                                        user: _this.getUser(message.payload.user),
                                        content: message.content,
                                        roomId: _this.getRoomId()
                                    }
                                    if (_this.eventRegirst.comment) {
                                        _this.event['comment'](commentMsg)
                                    }
                                    _this.ws.send(JSON.stringify({ action: 'comment', message: commentMsg }));
                                    break;

                                case 'WebcastGiftMessage':
                                    let giftMsg = {
                                        type: 'gift',
                                        msgId: message.id,
                                        user: _this.getUser(message.payload.user),
                                        content: message.common.describe,
                                        roomId: _this.getRoomId(),
                                        giftId: message.payload.gift.id,
                                        giftName: message.payload.gift.name,
                                        groupId: message.payload.gift.groupId,
                                        giftCount: parseInt(message.comboCount),
                                        repeatCount: parseInt(message.repeatCount),
                                        diamondCount: message.payload.gift.diamondCount
                                    }
                                    if (_this.eventRegirst.gift) {
                                        _this.event['gift'](giftMsg)
                                    }
                                    _this.ws.send(JSON.stringify({ action: 'gift', message: giftMsg }));
                                    break;

                                default:
                                    break;
                            }
                        }
                    }
                }
            }
        });
        this.chatObserverrom.observe(this.chatDom, { childList: true });
    }

    getUser(user) {
        if (!user) {
            return null;
        }
        let msg = {
            id: user.id,
            shortId: user.shortId,
            displayId: user.displayId,
            nickname: user.nickname,
            level: user.level,
            payLevel: user.payLevel,
            gender: user.gender,
            headImgUrl: user.headImgUrl,
            secUid: user.secUid,
            fansClub: this.getFansClubInfo(user.fansClub),
            followerCount: user.followerCount,
            followStatus: user.followStatus,
            followingCount: user.followingCount
        }
        return msg;
    }

    getFansClubInfo(fansClub) {
        if (!fansClub) {
            return null;
        }
        let info = {
            clubName: fansClub.clubName,
            level: fansClub.level
        }
        return info;
    }

    getRoomId() {
        let match = window.location.href.match(/\/(\d+)$/);
        return match ? match[1] : null;
    }
}

if (window.onDouyinServer) {
    window.onDouyinServer()
}

window.removeVideoLayer = function () {
    document.querySelector('.basicPlayer').remove()
    console.log('删除画面成功，不影响弹幕信息接收')
}
