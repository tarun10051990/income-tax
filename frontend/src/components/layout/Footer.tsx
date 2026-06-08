export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-primary">TaxFilr</span>
            </div>
            <p className="text-sm text-muted">
              AI-powered income tax filing platform for Indian taxpayers. File your ITR in minutes.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>File ITR</li>
              <li>Tax Calculator</li>
              <li>Tax Saving Tips</li>
              <li>AI Advisor</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>FAQs</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>DPDP Compliance</li>
              <li>Security</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-6 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} TaxFilr. All rights reserved. Not affiliated with the Income Tax Department of India.
        </div>
      </div>
    </footer>
  );
}
