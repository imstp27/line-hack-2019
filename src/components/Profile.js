import React from "react"
import styled from 'styled-components';

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
`;

const Greeting = styled.p`
  margin: 0;
  color: #939393;
  font-size: 18px;
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  p {
    margin-left: 1rem;
  }
`

export const Profile = ({ image, text }) => (<Container><Avatar src={image} /><Greeting>{text}</Greeting></Container>)