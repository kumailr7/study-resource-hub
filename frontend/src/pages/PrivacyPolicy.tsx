import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0e0e13] text-white p-8" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      <div className="max-w-4xl mx-auto">
        <Link to="/user" className="text-[#ff86c2] hover:underline mb-8 inline-block">
          ← Back to Hub
        </Link>
        
        <h1 className="text-4xl font-black mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-300">
          <p className="text-sm">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Introduction</h2>
            <p>At DevOps Dojo Hub, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Information We Collect</h2>
            <p>We may collect personal information that you voluntarily provide to us when you:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Create an account (name, email)</li>
              <li>Register for study sessions</li>
              <li>Submit resource requests</li>
              <li>Participate in community features</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Provide and improve our services</li>
              <li>Send you session notifications and updates</li>
              <li>Manage your account and registrations</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Analyze usage patterns to improve user experience</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Data Storage</h2>
            <p>Your personal information is stored in secure databases. We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Third-Party Services</h2>
            <p>We use third-party services for authentication (Clerk) and hosting. These providers have their own privacy policies addressing how they handle your information.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">6. Cookies</h2>
            <p>We may use cookies and similar tracking technologies to enhance your experience. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to certain exceptions)</li>
              <li>Opt-out of certain data collection</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">8. Children's Privacy</h2>
            <p>Our service is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">10. Contact Us</h2>
            <p>If you have questions or comments about this Privacy Policy, please contact us through the community channels.</p>
          </section>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} DevOps Dojo Hub. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;