import { FaLightbulb } from 'react-icons/fa';
import FactsAndFunPanel from './facts/FactsAndFunPanel';

export default function NewsFeed() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-white">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <header className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md">
            <FaLightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Facts &amp; Fun</h1>
            <p className="text-xs text-gray-500">10 new facts every day · saved for your class</p>
          </div>
        </header>
        <FactsAndFunPanel />
      </div>
    </div>
  );
}
