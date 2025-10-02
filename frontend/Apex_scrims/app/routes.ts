import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/join", "routes/join.tsx"),
  route("/login", "routes/login.tsx"),
  route("/register", "routes/register.tsx"),
  route("/lobby/:id", "routes/lobby.$id.tsx"),
  route("/profile", "routes/profile.tsx"),
] satisfies RouteConfig;
