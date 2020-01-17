import React from 'react'
import { Route, Switch } from 'react-router-dom'
import App from './App'
import DeviceController from './containers/DeviceController';
import Tracking from './containers/Tracking';
import Setting from './containers/Setting'


const Routes = () => (
  <App>
    <Switch>
      <Route exact path="/controller" component={DeviceController} />
      <Route exact path="/tracking" component={Tracking} />
      <Route exact path="/setting" component={Setting} />
    </Switch>
  </App>)

export default Routes