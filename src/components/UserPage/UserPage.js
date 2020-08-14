import React from 'react';
import { connect } from 'react-redux';
import LogOutButton from '../LogOutButton/LogOutButton';
import mapStoreToProps from '../../redux/mapStoreToProps';

// this could also be written with destructuring parameters as:
// const UserPage = ({ user }) => (
// and then instead of `props.user.username` you could use `user.username`
const UserPage = (props) => (
  <div style={{ margin: '20px' }}>
    {props.store.user.picture && (
      <img src={props.store.user.picture} style={{ width: '100px' }} />
    )}
    <h1 id="welcome">Welcome, {props.store.user.display_name}!</h1>
    <p>Your ID is: {props.store.user.id}</p>
    <LogOutButton className="log-in" />
  </div>
);

// this allows us to use <App /> in index.js
export default connect(mapStoreToProps)(UserPage);
