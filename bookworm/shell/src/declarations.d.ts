// Type declarations for Module Federation remote imports.
// TypeScript doesn't know about runtime remotes, so we declare them here.

declare module 'mfeAuth/AuthApp' {
  const AuthApp: React.ComponentType;
  export default AuthApp;
}

declare module 'mfeStore/StoreApp' {
  const StoreApp: React.ComponentType;
  export default StoreApp;
}

declare module 'mfeCheckout/CheckoutApp' {
  const CheckoutApp: React.ComponentType;
  export default CheckoutApp;
}
