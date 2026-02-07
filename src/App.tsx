import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import ChallengePage from "./pages/ChallengePage";
import CompetitionsPage from "./pages/CompetitionsPage";
import CompetitionLeaderboardPage from "./pages/CompetitionLeaderboardPage";
import AllTimeLeaderboardPage from "./pages/AllTimeLeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import SearchPage from "./pages/SearchPage";
import TeamPage from "./pages/TeamPage";
import AdminPage from "./pages/AdminPage";
import RulesPage from "./pages/RulesPage";
import StepsPage from "./pages/StepsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/utmaning/:id" element={<ChallengePage />} />
            <Route path="/tavlingar" element={<CompetitionsPage />} />
            <Route path="/leaderboard/:competitionId" element={<CompetitionLeaderboardPage />} />
            <Route path="/leaderboard" element={<CompetitionLeaderboardPage />} />
            <Route path="/leaderboard-alltime" element={<AllTimeLeaderboardPage />} />
            <Route path="/profil" element={<ProfilePage />} />
            <Route path="/profil/:userId" element={<PublicProfilePage />} />
            <Route path="/sok" element={<SearchPage />} />
            <Route path="/lag" element={<TeamPage />} />
            <Route path="/regler" element={<RulesPage />} />
            <Route path="/steg" element={<StepsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
