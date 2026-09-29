import ReactDOM from 'react-dom/client';
import AuthApp from './AuthApp';

// Standalone bootstrap — used when running mfe-auth independently on port 3001
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<AuthApp />);
