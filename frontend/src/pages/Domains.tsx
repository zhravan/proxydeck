import { Navigate, Route, Routes } from "react-router-dom";
import { DomainDetail } from "./domains/DomainDetail";
import { DomainForm } from "./domains/DomainForm";
import { DomainList } from "./domains/DomainList";

export function Domains() {
  return (
    <Routes>
      <Route index element={<DomainList />} />
      <Route path="new" element={<DomainForm />} />
      <Route path=":id" element={<DomainDetail />} />
      <Route path=":id/edit" element={<DomainForm />} />
      <Route path="*" element={<Navigate to="/domains" replace />} />
    </Routes>
  );
}
