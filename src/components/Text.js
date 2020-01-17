import styled from 'styled-components';

export const Text = styled.p`
  color: ${props => props.color || '#000'};
  font-size: ${props => props.fontSize || 'initial'};
  font-weight: ${props => props.bold ? 'bold' : 'normal'};
  margin: ${props => props.margin || 'initial'};
  width: ${props => props.width || 'auto'};
`;