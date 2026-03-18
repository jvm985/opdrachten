import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherLiveView from './pages/TeacherLiveView';
import TeacherResults from './pages/TeacherResults';
import TeacherBank from './pages/TeacherBank';
import StudentManagement from './pages/StudentManagement';
import PrintExam from './pages/PrintExam';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/live/:examKey" element={<TeacherLiveView />} />
          <Route path="/teacher/results/:examId" element={<TeacherResults />} />
          <Route path="/teacher/bank" element={<TeacherBank />} />
          <Route path="/teacher/students" element={<StudentManagement />} />
          <Route path="/teacher/print/:examKey" element={<PrintExam />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
