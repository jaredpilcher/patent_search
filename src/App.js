import logo from './logo.svg';
import './App.css';
import PatentClassCounter from "./PatentClassCounter";

function App() {
  return (
    <div className="App">
      <h1>Patent Search Tool</h1>
        <main>
            <PatentClassCounter />
        </main>
    </div>
  );
}

export default App;
