import React, { Component } from 'react'
import styled from 'styled-components';
import { Helmet } from "react-helmet";
import { Content } from "../components/Layout"
import { Text } from "../components/Text"
import { db } from '../firebase'
import { FlapperSpinner } from 'react-spinners-kit'
import Select from 'react-dropdown-select'
import moment from 'moment'
import 'moment/locale/th' 

const DayOptions = Array.from({ length: 31 }, (v, k) => ({ name: `${k + 1}`.padStart(2, '0'), value: `${k + 1}`.padStart(2, '0') }));
const MonthOptions = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"].map((e, i) => ({ name: e, value: `${i + 1}`.padStart(2, '0') }))
const YearOptions = Array.from({ length: 1 }, (v, k) => ({ name: `${k + 2562}`.padStart(4, '0'), value: `${k + 2019}`.padStart(4, '0') }));

class Tracking extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      loading: false,
      day: '',
      month: '',
      year: '',
      logs: [],
      isToday: true,
      dayShow: moment().format('YYYYMMDD')
    }
  }

  componentDidMount() {
    moment.locale('th'); 
    const today = new Date()
    this.fetchData(today)
  }

  async fetchData(date) {
    this.setState({ loading: true })
    const urlParams = new URLSearchParams(this.props.location.search)
    const patientID = urlParams.get('user')
    const logs = await new Promise((resolve, reject) => {
      db.collection("logs")
        .where("patientID", "==", patientID)
        .where("occurredOn", ">=", moment(date).startOf('day').toDate())
        .where("occurredOn", "<=", moment(date).endOf('day').toDate())
        .orderBy("occurredOn", "desc")
        .get()
        .then(async querySnapshot => {
          const data = await Promise.all(querySnapshot.docs.map(async doc => {
            const room = await new Promise((resolve, reject) => {
              const docData = doc.data()
              db.collection("rooms")
                .doc(docData.roomID)
                .get()
                .then(adoc => {
                  resolve(adoc.data())
                })
            })
            return { id: doc.id, ...doc.data(), room }
          }))
          resolve(data)
        })
    })
    console.log(logs)
    this.setState({ logs, loading: false })
  }

  onChangeDay = values => {
    if (values.length > 0) {
      this.setState({ day: values[0].value })
    }
  }

  onChangeMonth = values => {
    if (values.length > 0) {
      this.setState({ month: values[0].value })
    }
  }

  onChangeYear = values => {
    if (values.length > 0) {
      this.setState({ year: values[0].value })
    }
  }

  selectDate = () => {
    const { day, month, year } = this.state
    const date = `${year}${month}${day}`
    this.setState({ modal: false, isToday: false, dayShow: date }, () => this.fetchData(moment(date, 'YYYYMMDD')))
  }

  render() {
    const { modal, loading, logs, isToday, dayShow } = this.state
    return (<div>
      {modal && (<ModalContainer>
        {loading ? <FlapperSpinner size={30} color="#FF7F00" loading={loading} /> :
          <ModalContent>
            <>
              <div style={{ padding: '1rem' }}>
                <img alt="" src="/cancel.svg" onClick={() => this.setState({ modal: false, isToday: false, day: '', month: '', year: '' })} />
                <Text fontSize="20px">เลือกวันที่</Text>
                <div style={{ textAlign: 'left', marginBottom: '.7rem' }}>
                  <Text>วันที่</Text>
                  <Select
                    options={DayOptions}
                    labelField="name"
                    valueField="value"
                    style={{ width: 'auto' }}
                    onChange={this.onChangeDay}
                  />
                </div>
                <div style={{ textAlign: 'left', marginBottom: '.7rem' }}>
                  <Text>เดือน</Text>
                  <Select
                    options={MonthOptions}
                    labelField="name"
                    valueField="value"
                    style={{ width: 'auto' }}
                    onChange={this.onChangeMonth}
                  />
                </div>
                <div style={{ textAlign: 'left', marginBottom: '.7rem' }}>
                  <Text>ปี (พ.ศ.)</Text>
                  <Select
                    options={YearOptions}
                    labelField="name"
                    valueField="value"
                    style={{ width: 'auto' }}
                    onChange={this.onChangeYear}
                  />
                </div>
              </div>
              <div className="flex"><div onClick={() => this.selectDate()}>ตกลง</div></div>
            </>
          </ModalContent>}
      </ModalContainer>)}
      <Helmet>
        <title>ติดตามความเคลื่อนไหวผู้ป่วย</title>
      </Helmet>
      <Content>
        <FlexBar justifyContent="space-between" alignItems="center">
          <img alt="" src="/oldman.svg" />
          <Center>
            {isToday && <Text fontSize="18px">วันนี้</Text>}
            <Text fontSize="18px" color="#0F3498">{moment(dayShow, 'YYYYMMDD').format('ll')}</Text>
          </Center>
          <img alt="" src="/oldwoman.svg" />
        </FlexBar>
        <Table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>สถานะ</th>
              <th>ตำแหน่ง</th>
            </tr>
          </thead>
          <tbody>
            {!loading && (logs.length > 0
              ? logs.map((item, i) => <tr key={i}>
                <td>{moment(item.occurredOn.toDate()).format('HH:mm')}</td>
                <td>{item.action === "enter" ? "เข้า" : (item.action === "leave" ? "ออก" : item.action)}</td>
                <td>{item.room.name}</td>
              </tr>)
              : <tr><td /><td>ไม่พบข้อมูล</td><td /></tr>)}
          </tbody>
        </Table>
        <FlexBar justifyContent="center">
          {loading && <FlapperSpinner size={30} color="#FF7F00" loading={loading} />}
        </FlexBar>
        {!isToday && <ButtonSecondary onClick={() => this.setState({ isToday: true, dayShow: moment().format('YYYYMMDD') }, () => this.fetchData(new Date()))}>ดูข้อมูลวันนี้</ButtonSecondary>}
        <Button onClick={() => this.setState({ modal: true })}>เลือกวันที่อื่นเพื่อดูข้อมูล</Button>
      </Content>
    </div>)
  }
}

export default Tracking

const FlexBar = styled.div`
  display: flex;
  justify-content: ${props => props.justifyContent || 'flex-start'};
  align-items: ${props => props.alignItems || 'flex-start'};
  margin-bottom: .5rem;
`;

const Center = styled.div`
  text-align: center;
`;

const Table = styled.table`
  width: 100%;
  border-spacing: 0px;
  margin: 1.5rem 0;
  thead {
    tr {
      border-radius: 4px;
      background: #FFD9B4;
    }
    th {
      font-weight: 400 !important;
      padding: 5px;
    }
  }

  td {
    text-align: center;
    padding: 10px 5px;
  }
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
  cursor: pointer;
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
  position: fixed;
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
  position: relative;
  img {
    position: absolute;
    right: 1rem;
    top: 1rem;
  }
  div.flex {
    display: flex;
    div {
      flex: 1;
      text-align: center;
      border-top: .5px solid #8E8E8E;
      color: #0F3498;
      padding: .5rem;
      cursor: pointer;
      &:active,&:focus{
        background: lightblue;
        transition: background .3s;
      }
    }
  }
`