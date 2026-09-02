import { useQuery } from "@tanstack/react-query";
import { listSessions } from "../services/apiClient";

export function useSessions() { return useQuery({ queryKey: ["sessions"], queryFn: listSessions }); }
