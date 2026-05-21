export function isActiveRoute(
  pathname: string,
  route: string
): boolean {
  return (
    pathname === route ||
    (route !== "/dashboard" && pathname.startsWith(route + "/"))
  );
}
