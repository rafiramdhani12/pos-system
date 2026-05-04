import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
    route("/", "routes/login.tsx"),
    route("dashboard", "routes/dashboard.tsx"),
    route("kasir", "routes/kasir.tsx"),
    route("users", "routes/user.tsx"),
    route("barang", "routes/barang.tsx"),
    route("penjualan", "routes/penjualan.tsx"),
] satisfies RouteConfig;
