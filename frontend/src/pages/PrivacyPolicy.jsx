import '../styles/PrivacyPolicy.css';

export default function PrivacyPolicy() {
  return (
    <div className="privacy-policy__container">
      <div className="privacy-policy__card">
        <h1 className="privacy-policy__title">Privacy Policy</h1>
        <p className="privacy-policy__date">Effective Date: 26th February, 2026</p>
        <p>Welcome to <b>TrueDocs</b> ("we," "our," or "us"). Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our document analysis services.</p>
        <h2>1. Information We Collect</h2>
        <h3>1.1 Personal Information</h3>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Account login details (if you sign up)</li>
          <li>Payment information (processed securely by third-party providers)</li>
        </ul>
        <h3>1.2 Document Data</h3>
        <ul>
          <li>The document content is processed to provide analysis results.</li>
          <li>We do not sell or share your document data.</li>
        </ul>
        <h3>1.3 Usage Data</h3>
        <ul>
          <li>IP address</li>
          <li>Browser type</li>
          <li>Device information</li>
          <li>Pages visited</li>
          <li>Usage patterns</li>
        </ul>
        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>Provide document analysis services</li>
          <li>Improve our platform</li>
          <li>Process payments</li>
          <li>Communicate important updates</li>
          <li>Ensure platform security</li>
        </ul>
        <h2>3. Payment Processing</h2>
        <p>Payments are securely processed through trusted third-party payment providers. We do not store your full card details on our servers.</p>
        <h2>4. Data Storage & Security</h2>
        <p>We implement appropriate technical and organizational measures to protect your data. However, no system is 100% secure, and we cannot guarantee absolute security.</p>
        <h2>5. Data Retention</h2>
        <ul>
          <li>Uploaded documents may be stored temporarily for processing.</li>
          <li>We may delete files automatically after a certain period.</li>
          <li>Users may request deletion of their data.</li>
        </ul>
        <h2>6. Third-Party Services</h2>
        <p>We may use third-party services for:</p>
        <ul>
          <li>Authentication</li>
          <li>Payment processing</li>
          <li>Analytics</li>
          <li>Cloud storage</li>
        </ul>
        <p>These services have their own privacy policies.</p>
        <h2>7. Cookies</h2>
        <p>We may use cookies to:</p>
        <ul>
          <li>Improve user experience</li>
          <li>Remember login sessions</li>
          <li>Analyze traffic</li>
        </ul>
        <p>You can disable cookies in your browser settings.</p>
        <h2>8. Your Rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access your data</li>
          <li>Request correction</li>
          <li>Request deletion</li>
          <li>Withdraw consent</li>
        </ul>
        <p>To exercise these rights, contact us at:<br />
        <span role="img" aria-label="email">📧</span> <a href="mailto:support@truedocs.com">support@truedocs.com</a></p>
        <h2>9. Children's Privacy</h2>
        <p>TrueDocs is not intended for children under 13 years of age. We do not knowingly collect personal information from children.</p>
        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised effective date.</p>
        <h2>11. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact:</p>
        <ul>
          <li>TrueDocs Support</li>
          <li>Email: <a href="mailto:support@truedocs.com">support@truedocs.com</a></li>
          <li>Website: <a href="https://truedocs.com">https://truedocs.com</a></li>
        </ul>
      </div>
    </div>
  );
}
