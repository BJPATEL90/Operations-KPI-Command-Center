import { redirect } from "next/navigation";

const GITHUB_DASHBOARD_URL =
  "https://bjpatel90.github.io/Operations-KPI-Command-Center/";

export default function Home() {
  redirect(GITHUB_DASHBOARD_URL);
}
