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

const menu = [
  { icon: 'settings-gears.svg', name: 'ตั้งค่าการแจ้งเตือน', color: '#FF8319' },
  { icon: 'telephone-handle-silhouette.svg', name: 'ตั้งค่าเบอร์โทรฉุกเฉิน', color: '#40C3F4' }
]

class Setting extends Component {
  constructor(props) {
    super(props);
    this.state = {
      displayName: '',
      userId: '',
      pictureUrl: '',
      statusMessage: '',
      patientData: [],
      selectedChoice: -1,
      device: '',
      on: false,
      modal: false,
      loading: false,
      name: '',
      tel: ''
    }
    this.initialize = this.initialize.bind(this);
  }

  componentDidMount() {
    window.addEventListener('load', this.initialize);
    this.fetchData()
    // this.setState({ rooms })
  }

  async fetchData() {
    this.setState({ loading: true })
    const urlParams = new URLSearchParams(this.props.location.search)
    const patientID = urlParams.get('user')
    const patientData = await new Promise((resolve, reject) => {
      db.collection("patients")
        .doc(patientID)
        .get()
        .then(async doc => {
          const data = doc.data()
          resolve(data)
        })
    })
    this.setState({ patientData, loading: false, on: patientData.settingNotifyAuto || false, time: patientData.timeToNotify || '' })
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

  handleToggle(checked) {
    this.setState({ on: checked })
  }

  handleName = e => {
    this.setState({ name: e.target.value })
  }

  addContact = () => {
    this.setState({ loading: true })
    const { name, tel } = this.state
    const urlParams = new URLSearchParams(this.props.location.search)
    const patientID = urlParams.get('user')
    const vm = this
    const emergency = this.state.patientData.emergency || []
    emergency.push({ name, tel })
    this.setState({ loading: true }, () => {
      db.collection("patients").doc(patientID).set({
        emergency
      }, { merge: true })
        .then(() => {
          vm.setState({
            patientData: { ...this.state.patientData, emergency},
            modal: false,
            loading: false,
            name: '',
            tel: '',
            selectedChoice: 1
          })
        })
        .catch(function (error) {
          console.error("Error writing document: ", error);
        });
    })
  }

  handleRemoveContact = (i) => {
    this.setState({ loading: true })
    const urlParams = new URLSearchParams(this.props.location.search)
    const patientID = urlParams.get('user')
    const vm = this
    const emergency = this.state.patientData.emergency.filter((e, idx) => idx!= i)
    this.setState({ loading: true }, () => {
      db.collection("patients").doc(patientID).set({
        emergency
      }, { merge: true })
        .then(() => {
          vm.setState({
            patientData: { ...this.state.patientData, emergency},
            modal: false,
            loading: false
          })
        })
        .catch(function (error) {
          console.error("Error writing document: ", error);
        });
    })
  }

  submitSetting = e => {
    const urlParams = new URLSearchParams(this.props.location.search)
    const patientID = urlParams.get('user')
    const vm = this
    const { on, time } = this.state
    this.setState({ loading: true }, () => {
      db.collection("patients").doc(patientID).set({
        settingNotifyAuto: on,
        timeToNotify: time
      }, { merge: true })
        .then(() => {
          vm.setState({
            patientData: { ...this.state.patientData, settingNotifyAuto: on, timeToNotify: time },
            modal: false,
            loading: false,
            selectedChoice: -1
          })
        })
        .catch(function (error) {
          console.error("Error writing document: ", error);
        });
    })
  }

  handleTel = e => {
    this.setState({ tel: e.target.value })
  }

  handleTime = e => {
    this.setState({ time: e.target.value })
  }

  Toggle(checked) {
    const urlParams = new URLSearchParams(this.props.location.search)
    const patientID = urlParams.get('user')
    const vm = this
    this.setState({ loading: true }, () => {
      db.collection("patients").doc(patientID).set({
        settingNotifyAuto: checked
      }, { merge: true })
        .then(() => {
          vm.setState({
            settingNotifyAuto: checked,
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
    const { displayName, pictureUrl, selectedChoice, patientData, modal, on, loading, time } = this.state
    return (<div>
      {/* {modal && (<ModalContainer>
        {loading ? <FlapperSpinner size={30} color="#FF7F00" loading={loading} /> :
          <ModalContent>
            <>
              <img src="/switch.svg" height="48" style={{ margin: '2rem 0 0 0' }} />
              <Text margin="1rem 0">คุณต้องการ{on ? 'เปิด' : 'ปิด'}<br />การแจ้งเตือนผู้ป่วยออกจากบ้านอัติโนมัติ</Text>
              <div className="flex"><div onClick={() => this.setState({ modal: false, on: false })}>ยกเลิก</div><div onClick={() => this.Toggle(on)}>ตกลง</div></div>
            </>
          </ModalContent>}
      </ModalContainer>)} */}
      <Helmet>
        <title>ตั้งค่าไซมอน</title>
      </Helmet>
      {loading && <ModalContainer>
        <FlapperSpinner size={30} color="#FF7F00" loading={loading} />
      </ModalContainer>}
      <Content>
        {selectedChoice === -1
          && (
            <>
              <Profile text={`สวัสดี ${displayName}`} image={pictureUrl} />
              <Text color="#0F3498" bold margin="1.5rem 0" fontSize="18px">ยินดีต้อนรับ !<br />นวัตกรรมดูแลผู้ป่วยอัลไซเมอร์อัจฉริยะ</Text>
              <ImageBG src="/house.svg" />
              {/* <Text fontSize="18px" bold>เลือกห้องที่ต้องการควบคุม</Text> */}
              <Flex>
                {menu.map((item, idx) => <Box key={item.id} color={item.color} onClick={() => this.setState({ selectedChoice: idx })}>
                  <div><img src={`/${item.icon}`} /></div>
                  <p>{item.name}</p>
                </Box>)}
              </Flex>
            </>
          )}
        {selectedChoice === 0 &&
          <>
            <FlexBar justifyContent="space-between" alignItems="center">
              <FlexBar alignItems="center">
                <Text fontSize="16px" color="#0F3498">เปิด-ปิดการแจ้งเตือนออกจากบ้าน</Text>
              </FlexBar>
              <Switch
                checked={on}
                onChange={checked => this.handleToggle(checked)}
              />
            </FlexBar>
            {on &&
              (<><Text margin="0 0 .5rem 0">แจ้งเตือนหลังจากผู้ป่วยออกจากบ้าน (นาที)</Text>
                <Input value={time} onChange={this.handleTime} /></>)
            }
            <ButtonSecondary onClick={() => this.setState({ selectedChoice: 1 })}>ยกเลิก</ButtonSecondary>
            <Button onClick={() => this.submitSetting()}>บันทึก</Button>
          </>}
        {selectedChoice === 1 &&
          <>
            <Text fontSize="18px" color="#0F3498">เบอร์โทรฉุกเฉินทั้งหมด</Text>
            <Center onClick={() => this.setState({ selectedChoice: 2 })}>
              <img src="/plus.svg" width="40" />
              <Text fontSize="16px" color="#676767">เพิ่มเบอร์โทรฉุกเฉิน</Text>
            </Center>
            {patientData.emergency.map((e,i) => (<Card key={i}>
              <span onClick={() => this.handleRemoveContact(i)}><img src="/remove-button.svg" /></span>
              <FlexBar alignItems="center">
                <Text bold>ชื่อเบอร์</Text>
                <Text>{e.name}</Text>
              </FlexBar>
              <FlexBar alignItems="center">
                <Text bold>เบอร์โทร</Text>
                <Text>{e.tel}</Text>
              </FlexBar>
            </Card>))}

            <Button onClick={() => this.setState({ selectedChoice: -1 })}>กลับสู่หน้าหลัก</Button>
          </>
        }
        {selectedChoice === 2 &&
          <>
            <Text fontSize="18px" color="#0F3498" margin="0 0 1rem 0">เพิ่มเบอร์โทรฉุกเฉิน</Text>
            <FlexBar alignItems="center">
              <Text bold width="90px">ชื่อเบอร์</Text>
              <Input onChange={this.handleName} />
            </FlexBar>
            <FlexBar alignItems="center">
              <Text bold width="90px">เบอร์โทร</Text>
              <Input onChange={this.handleTel} />
            </FlexBar>
            <ButtonSecondary onClick={() => this.setState({ selectedChoice: 1 })}>ยกเลิก</ButtonSecondary>
            <Button onClick={() => this.addContact()}>บันทึก</Button>
          </>
        }
      </Content>
    </div>)
  }
}

export default withRouter(Setting)

const ImageBG = styled.img`
      position: absolute;
      top: 60px;
      width: calc(100% - 4rem);
      left: 2rem;
      right: 2rem;
    `;

const Input = styled.input`
  width: 100%;
  line-height: 28px;
  font-size: 16px;
  border: 1px solid;
  border-radius: 4px;
  text-indent: 5px;
  &:focus {
    outline: none;
  }
`;

const Box = styled.div`
  border-radius: 4px;
  box-shadow: rgba(49, 49, 49, 0.16) 0 3px 10px;
  background-color: #FFF;
  z-index: 1;
  flex: 1 0 calc(100% - 2rem);
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  div {
    padding: 1.5rem;
    background: ${props => props.color || '#000'};
    margin-right: 2rem; 
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    img {
      width: 2rem;
    }
  }
  p {
    color: ${props => props.color || '#000'};
    font-weight: bold;
    font-size: 20px;
  }
`;

const Card = styled.div`
  border-radius: 4px;
  box-shadow: rgba(49, 49, 49, 0.16) 0 3px 10px;
  background-color: #FFF;
  z-index: 1;
  margin-bottom: 1rem;
  padding: 1rem;
  position: relative;
  span {
    position: absolute;
    right: -12px;
    top: -10px;
  }
  div {
    p:first-of-type {
      margin-right: 1rem;
    }
  }
`;

const Flex = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const Center = styled.div`
  margin: 2rem;
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

const ButtonSecondary = styled.div`
  position: absolute;
  bottom: 56px;
  left: 0;
  right: 0;
  padding: 1rem;
  text-align: center;
  background: #F2F2F2;
  color: #000000;
  cursor: pointer;
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