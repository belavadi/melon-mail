import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="page-not-found">
    <h1>404 Page not found...</h1>
    <Link to={'/'} className="go-back">Go back!</Link>
  </div>
);

export default NotFound;
