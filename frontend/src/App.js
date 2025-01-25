import './App.css';
import {Routes, Route} from 'react-router-dom';
import HomePage from './components/HomePage';
import LoginPage from './components/BeforeLogin/LoginPage';
import React from 'react';

function App() {
  return (
    <div className="App">
        <Routes>
          <Route path="/home" element={<HomePage/>}/>
          <Route path="/" element={<LoginPage/>} />
          <Route path="*" element={<LoginPage/>} />
        </Routes>
    </div>
  );
}

export default App;
