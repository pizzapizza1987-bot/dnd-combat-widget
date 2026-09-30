export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body style={{margin:0,background:'#0d100c'}}>{children}</body></html>;
}
