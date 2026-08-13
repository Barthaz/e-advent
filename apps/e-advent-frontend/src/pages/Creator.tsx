import { Navigate } from 'react-router-dom';

/** @deprecated Use ProductSelector or CreatorInteractive instead */
export default function Creator() {
  return <Navigate to="/stworz-kalendarz/interaktywny" replace />;
}
