import GeneratorForm from '@/components/GeneratorForm';
import ApprovalBoard from '@/components/ApprovalBoard';
import ContentGallery from '@/components/ContentGallery';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-4 tracking-tight">
          AI Content Engine
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
          Your Human-in-the-Loop command center for generating, reviewing, and deploying AI-crafted social media content.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Generator Form & Pending Approvals */}
        <div className="lg:col-span-1 space-y-12">
          <section>
            <GeneratorForm />
          </section>
          
          <section>
            <ApprovalBoard />
          </section>
        </div>

        {/* Right Column: Content Gallery */}
        <div className="lg:col-span-2">
          <section className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl h-full min-h-[600px]">
            <ContentGallery />
          </section>
        </div>
      </div>
    </div>
  );
}
