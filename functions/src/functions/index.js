'use strict';

import cbor from "cbor";
import * as admin from "firebase-admin";
import * as functions from 'firebase-functions';
import config from "./config.json"
import moment from 'moment'
const line = require('@line/bot-sdk');
const express = require('express');
const iot = require('@google-cloud/iot');

const lineClient = new line.Client(config)
const iotClient = new iot.v1.DeviceManagerClient();

const app = express()
admin.initializeApp();

app.post("/webhook", line.middleware(config), (req, res) => {
  if (!Array.isArray(req.body.events)) {
    return res.status(500).end()
  }
  Promise.all(
    req.body.events.map(event => {
      if (event.source.userId === "Udeadbeefdeadbeefdeadbeefdeadbeef") {
        return
      }
      return handleEvent(event)
    })
  )
    .then(() => res.end())
    .catch(err => {
      console.error(err)
      res.status(500).end()
    })
})

app.post("/notice/:patientID/fall", async (req, res) => {
  const message = {
    type: 'text',
    text: "ผู้ป่วยล้ม"
  }
  const caregiverIDs = await new Promise((resolve, reject) => {
    admin.firestore().collection('patients').doc(req.params.patientID).get().then(doc => {
      const data = doc.data()
      if (data) {
        resolve(data.caregiverID)
      } else {
        resolve([])
      }
    })
  })
  caregiverIDs.forEach(id => {
    lineClient.pushMessage(id, message)
      .catch((err) => {
        console.error(err)
        res.status(500).end()
      })
  })
  return res.status(200).end()
})

app.post("/notice/:patientID/leave", async (req, res) => {

  const { caregiverIDs, name, timeToNotify } = await new Promise((resolve, reject) => {
    admin.firestore().collection('patients').doc(req.params.patientID).get().then(doc => {
      const data = doc.data()
      if (data) {
        resolve({ caregiverIDs: data.caregiverID, name: data.name, timeToNotify: data.timeToNotify })
      } else {
        resolve({ caregiverIDs: [], name: data.name, timeToNotify: data.timeToNotify || '15' })
      }
    })
  })

  const message = {
    type: 'text',
    text: `ขณะนี้คุณ${name}ได้ออกจากบ้านเป็นเวลา ${timeToNotify} นาทีแล้ว`
  }

  caregiverIDs.forEach(id => {
    lineClient.pushMessage(id, message)
      .catch((err) => {
        console.error(err)
        res.status(500).end()
      })
  })
  return res.status(200).end()
})

app.post("/notice/:patientID/forget", async (req, res) => {
  const message = {
    type: 'text',
    text: "ยังไม่ได้ปิดอุปกรณ์ในห้อง ..."
  }
  const caregiverIDs = await new Promise((resolve, reject) => {
    admin.firestore().collection('patients').doc(req.params.patientID).get().then(doc => {
      const data = doc.data()
      if (data) {
        resolve(data.caregiverID)
      } else {
        resolve([])
      }
    })
  })
  caregiverIDs.forEach(id => {
    lineClient.pushMessage(id, message)
      .catch((err) => {
        console.error(err)
        res.status(500).end()
      })
  })
  return res.status(200).end()
})

// const createJobForNotify = async (path, time, text = '') => {
//   const monthArray = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
//   const date = new Date()
//   const dateAdd = moment(date).add(time, 'minute').add(7, 'hour')
//   const schedule = `${dateAdd.date()} of ${monthArray[dateAdd.month()]} ${dateAdd.format('HH:mm')}`
//   const job = {
//     httpTarget: {
//       uri: `https://us-central1-line-hack-2019.cloudfunctions.net/webhook/notice/U6a6e2e2444211f5921e9b6dde321d12a/${path}`,
//       httpMethod: 'POST',
//       body: Buffer.from(text),
//     },
//     schedule,
//     timeZone: 'Asia/Bangkok',
//   };
//   const request = {
//     parent: parent,
//     job: job,
//   };
//   const [response] = await schedulerClient.createJob(request);
//   if (response) {
//     await admin.firestore().collection('jobs').doc('QRDWx9qwxka8leJMAo7n').set({ name: response.name }, { merge: true })
//     return
//   } else {
//     return
//   }
// }

// const removeJobForNotify = async (name) => {
//   await schedulerClient.deleteJob({ name });
//   await admin.firestore().collection('jobs').doc('QRDWx9qwxka8leJMAo7n').set({ name: '' }, { merge: true })
//   return
// }

exports.api = functions.https.onRequest(app);

exports.stateUpdate = functions.firestore
  .document('states/{deviceId}')
  .onWrite(async (change, context) => {
    if (context) {
      const request = generateRequest(context.params.deviceId, change.after.data());
      return iotClient.modifyCloudToDeviceConfig(request);
    } else {
      throw (Error("no context from trigger"));
    }
  });

exports.statePubSub = functions.pubsub
  .topic('Alzheimer')
  .onPublish((message) => {
    const { state } = message.data
      ? JSON.parse(Buffer.from(message.data, 'base64').toString())
      : { state: "000" };
    admin.firestore().collection('states').doc(message.attributes.deviceId).set({ state }, { merge: true })
      .then(writeResult => {
        admin.firestore().collection('devices').where("iotID", "==", message.attributes.deviceId)
          .get()
          .then(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            data.forEach(item => {
              admin.firestore().collection('devices').doc(item.id).set({ on: state[item.deviceIndex] === '1', updatedOn: new Date() }, { merge: true })
            })
          })
      });
    return "success"
  });

exports.watchPubSub = functions.pubsub
  .topic('Alzheimer_watch')
  .onPublish(async (message) => {
    const { action, user } = message.data
      ? JSON.parse(Buffer.from(message.data, 'base64').toString())
      : { action: "none", user: '' };
    if (action === "fall") {
      const message = {
        type: 'text',
        text: 'ขณะนี้ไซมอนคาดว่าผู้ป่วยอาจเกิดการล้ม \nกรุณาติดตามหรือติดต่อเพื่อขอความช่วยเหลือได้นะครับ',
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'message',
                label: 'รับทราบแล้ว',
                text: 'รับทราบแล้ว'
              }
            },
            {
              type: 'action',
              action: {
                type: 'message',
                label: 'ติดต่อขอความช่วยเหลือ',
                text: 'เบอร์โทรฉุกเฉิน'
              }
            }
          ]
        }
      }
      const caregiverIDs = await new Promise((resolve, reject) => {
        admin.firestore().collection('patients').doc(user).get().then(doc => {
          const data = doc.data()
          if (data) {
            resolve(data.caregiverID)
          } else {
            resolve([])
          }
        })
      })
      caregiverIDs.forEach(id => {
        lineClient.pushMessage(id, message)
          .catch((err) => {
            console.error(err)
            return "error"
          })
      })
      return "success"
    }
    return "success"
  });

function generateRequest(deviceId, configData) {
  const formattedName = iotClient.devicePath(config.gcloudProject, config.region, config.registry, deviceId);

  const message = configData.state
  const dataValue = Buffer.from(message).toString("base64");

  return {
    name: formattedName,
    binaryData: dataValue
  };
}

async function handleEvent(event) {
  switch (event.type) {
    case "message":
      const message = event.message
      switch (message.type) {
        case "text":
          return handleText(message, event)
        default:
          throw new Error(`Unknown message: ${JSON.stringify(message)}`)
      }

    case "follow":
      const profile = await client.getProfile(event.source.userId)
      const followText = `สวัสดีครับคุณ ${profile.displayName} ผมชื่อไซมอน เป็นผู้ช่วยอัจฉริยะสำหรับดูแลผู้ป่วยอัลไซเมอร์ครับ`
      return lineClient.replyMessage(event.replyToken, {
        type: "text",
        text: followText
      })

    case "unfollow":
      return console.log(`Unfollowed this bot: ${JSON.stringify(event)}`)

    case "join":
      return lineClient.replyMessage(event.replyToken, {
        type: "text",
        text: "สวัสดีครับ ผมชื่อไซมอน เป็นผู้ช่วยอัจฉริยะสำหรับดูแลผู้ป่วยอัลไซเมอร์ครับ"
      })

    case "leave":
      return console.log(`Left: ${JSON.stringify(event)}`)

    case "postback":
      let data = event.postback.data
      const postbackText = `Got postback: ${data}`
      return lineClient.replyMessage(event.replyToken, {
        type: "text",
        text: postbackText
      })

    case "beacon":
      const dm = `${Buffer.from(event.beacon.dm || "", "hex").toString("utf8")}`
      const beaconText = `${event.beacon.type} beacon hwid : ${
        event.beacon.hwid
        } with device message = ${dm}`
      return lineClient.replyMessage(event.replyToken, {
        type: "text",
        text: beaconText
      })

    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`)
  }
}

async function handleText(message, event) {
  let userId = getUserIDByType(event.source)
  const lineMessage = await handleMessageText(message, userId)
  console.log(JSON.stringify(lineMessage))
  if (lineMessage) {
    return lineClient.replyMessage(event.replyToken, lineMessage)
  } else {
    return console.log(message);
  }
}

function getUserIDByType(source) {
  switch (source.type) {
    case "user": return source.userId
    case "room": return source.roomId
    case "group": return source.groupId
  }
}

async function handleMessageText(message, userId) {
  switch (message.text) {
    case "เบอร์โทรฉุกเฉิน":
      const patientData = await new Promise((resolve, reject) => {
        admin.firestore().collection('patients').where('caregiverID', 'array-contains', userId).get().then(snapshot => {
          const data = snapshot.docs.map(item => item.data())
          if (data && data.length > 0) {
            resolve(data[0].emergency || [])
          } else {
            resolve([])
          }
        })
      })
      if (patientData.length > 0) {
        return ({
          type: "flex",
          altText: "หมายเลขฉุกเฉิน",
          contents: {
            type: 'bubble',
            size: 'giga',
            header: {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'image',
                      url: 'https://firebasestorage.googleapis.com/v0/b/line-hack-2019.appspot.com/o/danger.png?alt=media&token=36f9b3eb-22f6-4193-9889-ada132e1f581',
                      size: 'xxs'
                    }
                  ],
                  width: '20px'
                },
                {
                  type: 'text',
                  text: 'EMERGENCY CALL',
                  weight: 'bold',
                  decoration: 'none',
                  color: '#ffffff',
                  offsetStart: '10px',
                  gravity: 'center',
                  flex: 4
                }
              ]
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: patientData.map(item => {
                return ({
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: item.name
                    },
                    {
                      type: 'text',
                      text: item.tel
                    },
                    {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'image',
                          url: 'https://firebasestorage.googleapis.com/v0/b/line-hack-2019.appspot.com/o/telephone%20(3).png?alt=media&token=6aa5d72e-a454-420c-8132-a408a321a8d5',
                          size: 'xxs'
                        }
                      ],
                      backgroundColor: '#007500',
                      paddingAll: '8px',
                      position: 'absolute',
                      offsetEnd: '0px',
                      width: '40px',
                      action: {
                        type: 'uri',
                        label: 'call',
                        uri: `tel://${item.tel}`
                      }
                    }
                  ],
                  paddingBottom: '10px'
                })
              }),
            },
            styles: {
              header: {
                backgroundColor: '#c90000'
              },
              footer: {
                backgroundColor: '#c90000'
              }
            }
          }
        })
      } else {
        return ({ type: 'text', text: 'คุณยังไม่ได้ตั้งค่าหมายเลขฉุกเฉิน' })
      }
    case "ควบคุมอุปกรณ์ไฟฟ้า": return ({
      type: 'flex',
      altText: 'เช็คเครื่องใช้ไฟฟ้าภายในบ้าน',
      contents: {
        type: 'bubble',
        hero: {
          type: 'image',
          url: 'https://firebasestorage.googleapis.com/v0/b/plathong-blbvpu.appspot.com/o/Screen%20Shot%202562-09-13%20at%2021.23.09.png?alt=media&token=3d60600e-68c6-4b25-b0d4-37e92baf4c1d',
          size: 'full',
          aspectRatio: '20:13',
          aspectMode: 'cover'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'เช็คเครื่องใช้ไฟฟ้าภายในบ้าน',
              margin: 'xl',
              size: 'lg',
              align: 'center',
              weight: 'bold',
              color: '#EC7C23',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'sm'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: 'เข้าเช็คสถานะ',
                uri: 'line://app/1621483182-zbme1by7?home=Lbw4fkGdFnXHQRJ9Dn9j'
              },
              color: '#EC7C23',
              style: 'primary'
            }
          ]
        }
      }
    })
    default: return null;
  }
}



// async function handleEvent(event) {
//   switch (event.type) {
//     case "beacon":
//       const roomID = `${Buffer.from(event.beacon.dm.substring(0, 16) || "", "hex").toString()}`
//       const beaconText = `${event.beacon.type === "enter" ? 'เข้า' : (event.beacon.type === "leave" ? 'ออก' : event.beacon.type)} ห้อง ${roomID}`
//       console.log('beacon: ', event.beacon.hwid, ', user: ', event.source.userId)

//       if (event.source.userId === 'Ueaa43e012788c26920da628c3600bc48') {
//         if (event.beacon.type === "enter") {
//           const jobForget = await new Promise((resolve, reject) => {
//             admin.firestore().collection('jobs').doc(roomID).get().then(doc => {
//               resolve(doc.data())
//             })
//           })
//           if (jobForget && jobForget.name) {
//             await removeJobForNotify(jobForget.name)
//           }

//           const jobLeave = await new Promise((resolve, reject) => {
//             admin.firestore().collection('jobs').doc('QRDWx9qwxka8leJMAo7n').get().then(doc => {
//               resolve(doc.data())
//             })
//           })
//           if (jobLeave && jobLeave.name) {
//             await removeJobForNotify(jobLeave.name)
//           }
//         }
//         if (event.beacon.type === "leave") {
//           const onDevices = await new Promise((resolve, reject) => {
//             admin.firestore().collection('devices').where("roomID", "==", roomID).where("on", "==", true).get().then(querySnapshot => {
//               const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
//               resolve(data)
//             })
//           })
//           if (onDevices.length > 0) {
//             await createJobForNotify('forget', 5, roomID)
//           }
//           if (roomID === 'homedoor') {
//             await createJobForNotify('leave', 15)
//           }
//         }
//       }

//       if(roomID !== 'homedoor') {
//         admin.firestore().collection('logs').add({ action: event.beacon.type, occurredOn: new Date(), patientID: event.source.userId, roomID })
//       }

//       return lineClient.replyMessage(event.replyToken, {
//         type: "text",
//         text: beaconText
//       })

//     default:
//       throw new Error(`Unknown event: ${JSON.stringify(event)}`)
//   }
// }