import { KeyRound, Mail, Globe, ShieldCheck } from 'lucide-react';
import { useApp } from "../context/AppContext";

export const License = () => {
    const { user } = useApp();

    return (
        <div className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pb-10">
            {/* Header Section */}
            <div className="flex flex-col items-center text-center gap-2 px-1">
                <div className="p-2.5 bg-amber-50 rounded-xl">
                    <KeyRound className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">License Agreement</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Botivate Services LLP</p>
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-4xl mx-auto w-full">
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
                    
                    {/* Decorative Top Bar */}
                    <div className="h-2 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />
                    
                    <div className="p-8 md:p-12 space-y-10">
                        {/* Welcome/Context */}
                        <div className="text-center space-y-2">
                            <p className="text-sm font-bold text-amber-600 uppercase tracking-widest">Authorized Access</p>
                            <h2 className="text-xl font-bold text-gray-900">
                                Welcome, <span className="text-amber-600">{user?.username || 'Valued Client'}</span>
                            </h2>
                            <div className="w-12 h-1 bg-amber-100 mx-auto rounded-full mt-4" />
                        </div>

                        {/* Copyright Notice Card */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-100 to-yellow-50 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative bg-gradient-to-br from-white to-amber-50/30 border-2 border-amber-100 rounded-2xl p-8 transition-all duration-300">
                                <div className="flex flex-col items-center gap-4 text-center">
                                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                                        <ShieldCheck className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div className="text-2xl font-black text-gray-900 tracking-tighter">
                                        © BOTIVATE SERVICES LLP
                                    </div>
                                    <div className="max-w-xl">
                                        <p className="text-gray-600 leading-relaxed text-base font-medium">
                                            This enterprise software is developed and maintained exclusively by 
                                            <span className="text-amber-700 font-bold ml-1">Botivate Services LLP</span> for use by its verified clients. 
                                            Any unauthorized use, redistribution, modification, or copying of this software is 
                                            strictly prohibited and may result in legal consequences under relevant jurisdiction.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information & Support */}
                        <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
                            <div className="flex flex-col items-center gap-6">
                                <div className="text-center space-y-1">
                                    <h4 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Technical Support & Licensing</h4>
                                    <p className="text-sm text-gray-500">For inquiries, updates, or support, please reach out via the following channels:</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                                    <a 
                                        href="mailto:info@botivate.in" 
                                        className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/5 transition-all group"
                                    >
                                        <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                                            <Mail className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <span className="font-bold text-gray-700 group-hover:text-amber-700">info@botivate.in</span>
                                    </a>
                                    
                                    <a 
                                        href="https://www.botivate.in" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/5 transition-all group"
                                    >
                                        <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                                            <Globe className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <span className="font-bold text-gray-700 group-hover:text-amber-700">www.botivate.in</span>
                                    </a>
                                </div>

                                <div className="pt-4 text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Crafted with passion by the Botivate Team</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
