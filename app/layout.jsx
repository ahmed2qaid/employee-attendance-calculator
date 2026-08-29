import './globals.css';

export const metadata = {
  title: 'حاسبة دوام الموظفين',
  description: 'حاسبة دوام مرنة بدون قاعدة بيانات'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
