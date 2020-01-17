import React, { Component } from 'react'
import styled from 'styled-components';
import { Helmet } from "react-helmet";
import { Content } from "../components/Layout"
import { Profile } from "../components/Profile"
import { Text } from "../components/Text"
import { withRouter } from "react-router-dom";
import Switch from 'react-ios-switch';
import { db } from '../firebase'
import { FlapperSpinner } from 'react-spinners-kit'

const liff = window.liff;

class DeviceController extends Component {
  constructor(props) {
    super(props);
    this.state = {
      displayName: '',
      userId: '',
      pictureUrl: '',
      statusMessage: '',
      rooms: [],
      selectedRoom: -1,
      device: '',
      on: false,
      modal: false,
      deviceId: '',
      loading: false
    }
    this.initialize = this.initialize.bind(this);
  }

  componentDidMount() {
    window.addEventListener('load', this.initialize);
    this.fetchData()
    // this.setState({ rooms })
  }

  async fetchData() {
    const rooms = await new Promise((resolve, reject) => {
      db.collection("rooms")
        .where("homeID", "==", "Lbw4fkGdFnXHQRJ9Dn9j")
        .get()
        .then(async querySnapshot => {
          const data = await Promise.all(querySnapshot.docs.map(async doc => {
            const devices = await new Promise((resolve, reject) => {
              db.collection("devices")
                .where("roomID", "==", doc.id)
                .get()
                .then(querySnapshotDevice => {
                  const data = querySnapshotDevice.docs.map(adoc => ({ id: adoc.id, ...adoc.data() }))
                  resolve(data)
                })
            })
            return { id: doc.id, ...doc.data(), devices }
          }))
          resolve(data)
        })
    })
    this.setState({ rooms })
  }

  initialize() {
    liff.init(async (data) => {
      let profile = await liff.getProfile();
      this.setState({
        displayName: profile.displayName,
        userId: profile.userId,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage
      });
    });
  }

  handleToggle(id, checked, name) {
    this.setState({ modal: true, on: checked, device: name, deviceId: id })
  }

  Toggle(id, checked) {
    const { rooms, selectedRoom } = this.state
    const vm = this
    this.setState({ loading: true }, () => {
      db.collection("devices").doc(id).set({
        on: checked,
        updatedOn: new Date()
      }, { merge: true })
        .then(async () => {
          let roomsData = await Promise.all(rooms.map(async (e, idx) => {
            if (selectedRoom === idx) {
              e.devices = await await Promise.all(e.devices.map(async (item) => {
                if (item.id === id) {
                  const stateRef = db.collection("states").doc(item.iotID)
                  let state = await new Promise((resolve, reject) => {
                    stateRef.get().then(doc => {
                      const data = doc.data()
                      resolve(data.state)
                    })
                  })
                  state = state.substr(0, item.deviceIndex) + (checked ? '1' : '0') + state.substr(item.deviceIndex + 1);
                  db.collection("states").doc(item.iotID).set({
                    state
                  }, { merge: true })
                  item.on = checked
                }
                return item
              }))
            }
            return e
          }))
          vm.setState({
            rooms: roomsData,
            modal: false,
            loading: false
          })
        })
        .catch(function (error) {
          console.error("Error writing document: ", error);
        });
    })
  }

  render() {
    const { displayName, pictureUrl, selectedRoom, rooms, modal, on, device, deviceId, loading } = this.state
    return (<div>
      {modal && (<ModalContainer>
        {loading ? <FlapperSpinner size={30} color="#FF7F00" loading={loading} /> :
          <ModalContent>
            <>
              <img src="/switch.svg" height="48" style={{ margin: '2rem 0 0 0' }} />
              <Text margin="1rem 0">คุณต้องการ{on ? 'เปิด' : 'ปิด'}<br />{device}</Text>
              <div className="flex"><div onClick={() => this.setState({ modal: false, on: false, device: '', deviceId: '' })}>ยกเลิก</div><div onClick={() => this.Toggle(deviceId, on)}>ตกลง</div></div>
            </>
          </ModalContent>}
      </ModalContainer>)}
      <Helmet>
        <title>ควบคุมเครื่องใช้ไฟฟ้าภายในบ้าน</title>
      </Helmet>
      <Content>
        {selectedRoom === -1
          ? (
            <>
              <Profile text={`สวัสดี ${displayName}`} image={pictureUrl} />
              <Text color="#0F3498" bold margin="1.5rem 0" fontSize="18px">ยินดีต้อนรับ !<br />นวัตกรรมดูแลผู้ป่วยอัลไซเมอร์อัจฉริยะ</Text>
              <ImageBG src="/house.svg" />
              <Text fontSize="18px" bold>เลือกห้องที่ต้องการควบคุม</Text>
              <Flex>
                {rooms.map((item, idx) => <Box key={item.id} color={item.color} onClick={() => this.setState({ selectedRoom: idx })}><img alt="" src={`/${item.icon}`} height="25" /><Text fontSize="12px">{item.name}</Text><Text fontSize="9px">{item.devices.length > 0 ? `${item.devices.filter(e => e.on).length}/${item.devices.length} อุปกรณ์ที่เปิดอยู่` : 'ยังไม่ติดตั้งอุปกรณ์'}</Text></Box>)}
              </Flex>
            </>
          )
          : (
            <>
              <Center>
                <Icon><img alt="" src={`${rooms[selectedRoom].icon}`} /></Icon>
                <Text fontSize="16px">{rooms[selectedRoom].name}</Text>
                <Text fontSize="14px" color="#939393">{rooms[selectedRoom].devices.length} อุปกรณ์</Text>
                <Hr />
              </Center>
              {rooms[selectedRoom].devices.map((e, i) => (
                <FlexBar key={i} justifyContent="space-between" alignItems="center">
                  <FlexBar alignItems="center">
                    <IconGray><img alt="" src={`/${e.icon}`} /></IconGray>
                    <Text fontSize="16px">{e.name}</Text>
                  </FlexBar>
                  <Switch
                    checked={e.on}
                    onChange={checked => this.handleToggle(e.id, checked, e.name)}
                  />
                </FlexBar>
              ))}
              <Button onClick={() => this.setState({ selectedRoom: -1 })}>กลับสู่หน้าหลัก</Button>
            </>
          )
        }
      </Content>
    </div>)
  }
}

export default withRouter(DeviceController)

const ImageBG = styled.img`
      position: absolute;
      top: 60px;
      width: calc(100% - 4rem);
      left: 2rem;
      right: 2rem;
    `;

const Box = styled.div`
  border-radius: 4px;
  border: 1.5px solid ${props => props.color || '#000'};
  box-shadow: rgba(49, 49, 49, 0.16) 0 3px 10px;
  background-color: #FFF;
  padding: 1rem .5rem;
  z-index: 1;
  flex: 1 0 calc(33% - 2rem);
`;

const Flex = styled.div`
  display: flex;
  flex-wrap: wrap;
  div {
    margin: .3rem;
    &:nth-child(3n+1) {
        margin-left: 0;
      }
    &:nth-child(3n+3) {
        margin-right: 0;
      }
    }
`;

const Icon = styled.span`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(234, 234, 234, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  img {
    width: 30px;
  }
  margin: .5rem auto;
`;
const IconGray = styled.span`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #EBEBEB;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 1rem;
  img {
    width: 20px;
  }
`;

const Center = styled.div`
  text-align: center;
`;

const Hr = styled.hr`
  border: none;
  border-bottom: 1px solid #D9D9D9;
  margin-bottom: 1rem;
`;

const FlexBar = styled.div`
  display: flex;
  justify-content: ${props => props.justifyContent || 'flex-start'};
  align-items: ${props => props.alignItems || 'flex-start'};
  margin-bottom: .5rem;
`;

const Button = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  text-align: center;
  background: #FF7F00;
  color: #FFF;
`;

const ModalContainer = styled.div`
  position: absolute;
  z-index: 999;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  opacity: 20%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.div`
  background: #FFF;
  width: 300px;
  border-radius: 4px;
  text-align: center;
  div.flex {
    display: flex;
    div {
      flex: 1;
      text-align: center;
      border-top: .5px solid #8E8E8E;
      color: #0F3498;
      padding: .5rem;
      cursor: pointer;
      &:nth-child(1) {
        border-right: .5px solid #8E8E8E;
      }
      &:active,&:focus{
        background: lightblue;
        transition: background .3s;
      }
    }
  }
`