import logo from './logo.svg';
import './App.css';
import GroupedDataDashboard from './components/dashboard/GroupedDataDashboard';
function App() {
  return (
    <div className='min-h-screen bg-gray-100'>
      <GroupedDataDashboard />
      {/* <AppUsageDashboard /> */}
    </div>
  );
}

export default App;
