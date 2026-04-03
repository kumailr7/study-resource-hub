import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0e0e13] text-white p-8" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      <div className="max-w-4xl mx-auto">
        <Link to="/user" className="text-[#ff86c2] hover:underline mb-8 inline-block">
          ← Back to Hub
        </Link>
        
        <h1 className="text-4xl font-black mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-gray-300">
          <p className="text-sm">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using DevOps Dojo Hub, you accept and agree to be bound by the terms and provision of this agreement.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Use License</h2>
            <p>Permission is granted to temporarily use DevOps Dojo Hub for personal, non-commercial use only. This is the grant of a license, not a transfer of title.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. User Account</h2>
            <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. User Conduct</h2>
            <p>You agree not to use the service to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Upload or transmit any content that is illegal, harmful, or offensive</li>
              <li>Impersonate any person or entity</li>
              <li>Violate any intellectual property rights</li>
              <li>Engage in any activity that could harm the service or its users</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Session Participation</h2>
            <p>By registering for study sessions, you agree to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Attend the sessions you register for</li>
              <li>Respect other participants and hosts</li>
              <li>Follow the community guidelines during sessions</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">6. Intellectual Property</h2>
            <p>All content, resources, and materials on DevOps Dojo Hub are the property of the community or their respective owners. You may not copy, distribute, or use these materials without permission.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">7. Disclaimer</h2>
            <p>DevOps Dojo Hub is provided "as is" without warranty of any kind. We do not guarantee the accuracy or reliability of any content or resources.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">8. Limitation of Liability</h2>
            <p>DevOps Dojo Hub shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">9. Contact</h2>
            <p>If you have any questions about these Terms of Service, please contact us through the community channels.</p>
          </section>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} DevOps Dojo Hub. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;