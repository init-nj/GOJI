import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Camera,
  Brain,
  Calculator,
  Wallet,
  TrendingUp,
  Heart,
  DollarSign,
  FileText,
  Users,
  BarChart3,
  AlertCircle,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: 'Smart Bill Scanner',
      description: 'Upload receipts. AI extracts amount, date, vendor instantly. No manual typing.',
    },
    {
      icon: Brain,
      title: 'AI Auto-Categorization',
      description: 'NLP classifier sorts every expense. Marketing, software, rent—done automatically.',
    },
    {
      icon: Calculator,
      title: 'Automated Payroll',
      description: 'Calculate salaries with bonuses, overtime, deductions, and leave—all automatic.',
    },
    {
      icon: Wallet,
      title: 'Budget Control',
      description: 'Set org budget and revenue. Track spending against income in real-time.',
    },
    {
      icon: TrendingUp,
      title: 'Predict Cash Flow',
      description: 'ML models forecast burn rate, runway, and budget overruns before they happen.',
    },
    {
      icon: Heart,
      title: 'Health Score',
      description: 'Get a 0-10 financial wellness grade. See what\'s working, what needs fixing.',
    },
  ];

  const steps = [
    { icon: DollarSign, title: 'Set Your Budget', description: 'Enter org revenue/budget' },
    { icon: FileText, title: 'Track Expenses', description: 'Upload receipts or manual entry' },
    { icon: Users, title: 'Manage Payroll', description: 'Add employees, process salaries' },
    { icon: BarChart3, title: 'Get Insights', description: 'View health score, predictions' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-black cursor-pointer" onClick={() => navigate('/intro')}>
              GOJI
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button className="bg-[#FF6B6B] hover:bg-[#FF5252]" onClick={() => navigate('/signup')}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-6xl font-bold text-black mb-6">
          Stop guessing. Start knowing.
        </h2>
        <p className="text-xl text-[#2C2C2C] mb-10 max-w-3xl mx-auto">
          AI-powered expense tracking and payroll management for startups. Know your financial health—instantly.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-[#FF6B6B] hover:bg-[#FF5252] text-lg px-8"
            onClick={() => navigate('/signup')}
          >
            Start Free
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg px-8"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See Demo
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-4xl font-bold text-black text-center mb-12">
            Everything you need to manage finances
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <feature.icon className="w-12 h-12 text-[#FF6B6B] mb-4" />
                <h4 className="text-xl font-bold text-black mb-2">{feature.title}</h4>
                <p className="text-[#2C2C2C]">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-4xl font-bold text-black text-center mb-12">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-[#FF6B6B]" />
                </div>
                <h4 className="font-bold text-lg text-black mb-2">{step.title}</h4>
                <p className="text-[#2C2C2C] text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Showcase */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-4xl font-bold text-black text-center mb-4">Powered by AI</h3>
          <p className="text-center text-[#2C2C2C] mb-12 text-lg">
            Advanced machine learning that works behind the scenes
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-6 h-6 text-[#FF6B6B]" />
                <h4 className="font-bold text-lg">Expense Categorization</h4>
              </div>
              <p className="text-[#2C2C2C] mb-4">95% accuracy in auto-categorization</p>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="text-sm font-mono">
                  <div className="text-[#00FF00]">✓ "AWS Invoice" → Software (92% confident)</div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-[#FF6B6B]" />
                <h4 className="font-bold text-lg">Anomaly Detection</h4>
              </div>
              <p className="text-[#2C2C2C] mb-4">Catches unusual expenses before they become problems</p>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="text-sm font-mono">
                  <div className="text-[#F59E0B]">⚠️ "$15,000 marketing spend" → Flagged</div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-[#FF6B6B]" />
                <h4 className="font-bold text-lg">Cash Flow Prediction</h4>
              </div>
              <p className="text-[#2C2C2C] mb-4">Forecast next 3 months with ML regression</p>
              <div className="bg-gray-100 rounded-lg p-4 h-20"></div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-[#FF6B6B]" />
                <h4 className="font-bold text-lg">Spending Pattern Analysis</h4>
              </div>
              <p className="text-[#2C2C2C] mb-4">Identifies trends and recommends optimizations</p>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="text-sm font-mono">
                  <div className="text-[#3B82F6]">💡 "Software costs up 40% this quarter"</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Terminal Demo */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h3 className="text-4xl font-bold text-black text-center mb-12">
            Terminal-First Interface
          </h3>
          <Card className="bg-[#1E1E1E] rounded-2xl overflow-hidden">
            {/* Window Chrome */}
            <div className="bg-[#2A2A2A] px-4 py-3 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
              </div>
              <span className="text-gray-400 text-sm ml-4">goji-terminal</span>
            </div>

            {/* Terminal Content */}
            <div className="p-6 font-mono text-sm text-[#00FF00]">
              <div className="mb-2">$ goji analyze expenses --month=feb</div>
              <div className="text-gray-400 mb-2">&gt; Loading 47 transactions...</div>
              <div className="text-gray-400 mb-2">&gt;</div>
              <div className="text-white mb-2">&gt; Category Breakdown:</div>
              <div className="text-white ml-4 mb-1">&gt;   Marketing:  $8,430 (35%) <span className="text-[#F59E0B]">⚠️ 82% of budget</span></div>
              <div className="text-white ml-4 mb-1">&gt;   Software:   $4,890 (20%)</div>
              <div className="text-white ml-4 mb-1">&gt;   Payroll:    $7,200 (30%)</div>
              <div className="text-white ml-4 mb-2">&gt;   Rent:       $3,600 (15%)</div>
              <div className="text-white mb-2">&gt;</div>
              <div className="text-white mb-2">&gt; 🔍 Anomalies Detected: 2</div>
              <div className="text-gray-400 ml-4 mb-1">&gt;   - $15,000 marketing spend (unusual)</div>
              <div className="text-gray-400 ml-4 mb-2">&gt;   - Duplicate invoice: AWS #12345</div>
              <div className="text-white mb-2">&gt;</div>
              <div className="text-white mb-1">&gt; 📊 Financial Health: <span className="text-[#10B981]">7.2/10 (Good)</span></div>
              <div className="text-white mb-1">&gt; 💰 Burn Rate: $24,120/month</div>
              <div className="text-white mb-2">&gt; 🏃 Runway: 8.3 months</div>
              <div className="text-white mb-2">&gt;</div>
              <div className="text-[#00FF00]">✓ Analysis complete in 2.3s</div>
              <div className="mt-2">
                <span className="text-[#00FF00]">$</span>
                <span className="animate-pulse ml-1">_</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#FF6B6B] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to take control of your finances?
          </h3>
          <p className="text-xl text-white/90 mb-8">
            Join startups using GOJI to manage their financial health
          </p>
          <Button
            size="lg"
            className="bg-white text-[#FF6B6B] hover:bg-gray-100 text-lg px-8"
            onClick={() => navigate('/signup')}
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2026 GOJI. AI-Powered Financial Management for Startups.
          </p>
        </div>
      </footer>
    </div>
  );
}
