const Barrage = class {
  wsurl = 'wss://your-websocket-url' // WebSocket连接地址
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

  // 消息事件: join, message, like, follow, share, comment, gift
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
    this.observer && this.observer.disconnect()
    this.chatObserverrom && this.chatObserverrom.disconnect()
    this.timer = setInterval(() => {
      console.log('正在等待服务器启动..')
      this.ws = new WebSocket(this.wsurl)
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
              user: this.getUser(user),
              content: `${user.nickname} 来了`
            }
            if (this.eventRegirst.join) {
              this.event['join'](msg)
            }
            this.ws.send(JSON.stringify(msg))
          }
        }
      })
      this.observer.observe(this.roomJoinDom, { childList: true })
    }

    this.chatObserverrom = new MutationObserver((mutationsList, observer) => {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          let b = mutation.addedNodes[0]
          if (b[this.propsId].children.props.message) {
            let message = this.messageParse(b)
            if (message) {
              this.ws.send(JSON.stringify(message))
            }
          }
        }
      }
    })
    this.chatObserverrom.observe(this.chatDom, { childList: true })
  }

  getUser(user) {
    if (!user) {
      return
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
    return msg
  }

  getFansClubInfo(fansClub) {
    if (!fansClub) {
      return null
    }
    let info = {
      clubName: fansClub.clubName,
      level: fansClub.level
    }
    return info
  }

  messageParse(dom) {
    if (!dom[this.propsId].children.props.message) {
      return null
    }
    let msg = dom[this.propsId].children.props.message.payload
    let result = {
      type: 'message',
      msgId: msg.msgId,
      user: this.getUser(msg.user),
      content: msg.content,
      roomId: msg.roomId
    }

    switch (msg.method) {
      case 'WebcastMemberMessage':
        result.type = 'join'
        result.currentCount = msg.currentCount
        break
      case 'WebcastLikeMessage':
        result.type = 'like'
        result.count = msg.count
        result.total = msg.total
        break
      case 'WebcastFollowMessage':
        result.type = 'follow'
        break
      case 'WebcastShareMessage':
        result.type = 'share'
        result.shareType = msg.shareType
        break
      case 'WebcastChatMessage':
        result.type = 'comment'
        break
      case 'WebcastGiftMessage':
        result.type = 'gift'
        result.giftId = msg.giftId
        result.giftName = msg.giftName
        result.groupId = msg.groupId
        result.giftCount = msg.giftCount
        result.repeatCount = msg.repeatCount
        result.diamondCount = msg.diamondCount
        break
      case 'WebcastRoomStatsMessage':
        result.type = 'stats'
        result.onlineUserCount = msg.onlineUserCount
        result.totalUserCount = msg.totalUserCount
        result.totalUserCountStr = msg.totalUserCountStr
        result.onlineUserCountStr = msg.onlineUserCountStr
        break
      case 'WebcastFansclubMessage':
        result.type = 'fansclub'
        result.fansclubType = msg.type
        result.fansclubLevel = msg.level
        break
      case 'WebcastRoomMessage':
        result.type = 'room'
        break
      default:
        break
    }

    return result
  }
}

if (window.onBarrageServer) {
  window.onBarrageServer()
}

window.removeVideoLayer = function () {
  document.querySelector('.basicPlayer').remove()
  console.log('删除画面成功，不影响弹幕信息接收')
}
