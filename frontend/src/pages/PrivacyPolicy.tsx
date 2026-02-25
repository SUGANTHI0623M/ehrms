import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Clock, Mail, Info } from "lucide-react";

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <Card className="border-none shadow-2xl bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center border-b border-border/50 pb-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-primary/10 rounded-2xl">
                                <Shield className="w-12 h-12 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                            Privacy Policy
                        </CardTitle>
                        <p className="mt-4 text-muted-foreground text-lg">
                            Last updated: January 1, 2026
                        </p>
                    </CardHeader>
                    <CardContent className="pt-10">
                        <ScrollArea className="h-full pr-4">
                            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                                <section>
                                    <p className="leading-relaxed text-foreground/80">
                                        This privacy policy applies to the <strong>AEHRMS</strong> app (hereby referred to as "Application") for mobile devices that was created by <strong>ASK EVA</strong> (hereby referred to as "Service Provider") as a Free service. This service is intended for use "AS IS".
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Info className="w-5 h-5" />
                                        <h2 className="text-2xl font-bold m-0 text-foreground">Information Collection and Use</h2>
                                    </div>
                                    <p className="leading-relaxed">
                                        The Application collects information when you download and use it. This information may include information such as:
                                    </p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li>Your device's Internet Protocol address (e.g. IP address)</li>
                                        <li>The pages of the Application that you visit, the time and date of your visit, the time spent on those pages</li>
                                        <li>The time spent on the Application</li>
                                        <li>The operating system you use on your mobile device</li>
                                    </ul>
                                </section>

                                <section className="space-y-4">
                                    <p className="leading-relaxed">
                                        The Application collects your device's location, which helps the Service Provider determine your approximate geographical location and make use of in below ways:
                                    </p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li><strong>Geolocation Services:</strong> The Service Provider utilizes location data to provide features such as personalized content, relevant recommendations, and location-based services.</li>
                                        <li><strong>Analytics and Improvements:</strong> Aggregated and anonymized location data helps the Service Provider to analyze user behavior, identify trends, and improve the overall performance and functionality of the Application.</li>
                                        <li><strong>Third-Party Services:</strong> Periodically, the Service Provider may transmit anonymized location data to external services. These services assist them in enhancing the Application and optimizing their offerings.</li>
                                    </ul>
                                    <p className="leading-relaxed italic text-muted-foreground">
                                        The Service Provider may use the information you provided to contact you from time to time to provide you with important information, required notices and marketing promotions.
                                    </p>
                                    <p className="leading-relaxed">
                                        For a better experience, while using the Application, the Service Provider may require you to provide us with certain personally identifiable information. The information that the Service Provider request will be retained by them and used as described in this privacy policy.
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <h2 className="text-2xl font-bold text-foreground">Third Party Access</h2>
                                    <p className="leading-relaxed">
                                        Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the Application and their service. The Service Provider may share your information with third parties in the ways that are described in this privacy statement.
                                    </p>
                                    <p className="leading-relaxed">
                                        The Service Provider may disclose User Provided and Automatically Collected Information:
                                    </p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li>As required by law, such as to comply with a subpoena, or similar legal process;</li>
                                        <li>When they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request;</li>
                                        <li>With their trusted services providers who work on their behalf, do not have an independent use of the information we disclose to them, and have agreed to adhere to the rules set forth in this privacy statement.</li>
                                    </ul>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Shield className="w-5 h-5" />
                                        <h2 className="text-2xl font-bold m-0 text-foreground">Use of Artificial Intelligence</h2>
                                    </div>
                                    <p className="leading-relaxed">
                                        The Application uses Artificial Intelligence (AI) technologies to enhance user experience and provide certain features. The AI components may process user data to deliver personalized content, recommendations, or automated functionalities. All AI processing is performed in accordance with this privacy policy and applicable laws. If you have questions about the AI features or data processing, please contact the Service Provider.
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <h2 className="text-2xl font-bold text-foreground">Opt-Out Rights</h2>
                                    <p className="leading-relaxed text-foreground/80">
                                        You can stop all collection of information by the Application easily by uninstalling it. You may use the standard uninstall processes as may be available as part of your mobile device or via the mobile application marketplace or network.
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Clock className="w-5 h-5" />
                                        <h2 className="text-2xl font-bold m-0 text-foreground">Data Retention Policy</h2>
                                    </div>
                                    <p className="leading-relaxed">
                                        The Service Provider will retain User Provided data for as long as you use the Application and for a reasonable time thereafter. If you'd like them to delete User Provided Data that you have provided via the Application, please contact them at <a href="mailto:askeva.apps@gmail.com" className="text-primary hover:underline">askeva.apps@gmail.com</a> and they will respond in a reasonable time.
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <h2 className="text-2xl font-bold text-foreground">Children</h2>
                                    <p className="leading-relaxed">
                                        The Service Provider does not use the Application to knowingly solicit data from or market to children under the age of 13.
                                    </p>
                                    <p className="leading-relaxed">
                                        The Service Provider does not knowingly collect personally identifiable information from children. The Service Provider encourages all children to never submit any personally identifiable information through the Application and/or Services. The Service Provider encourage parents and legal guardians to monitor their children's Internet usage and to help enforce this Policy by instructing their children never to provide personally identifiable information through the Application and/or Services without their permission. If you have reason to believe that a child has provided personally identifiable information to the Service Provider through the Application and/or Services, please contact the Service Provider (<a href="mailto:askeva.apps@gmail.com" className="text-primary hover:underline">askeva.apps@gmail.com</a>) so that they will be able to take the necessary actions. You must also be at least 16 years of age to consent to the processing of your personally identifiable information in your country (in some countries we may allow your parent or guardian to do so on your behalf).
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <h2 className="text-2xl font-bold text-foreground">Security</h2>
                                    <p className="leading-relaxed">
                                        The Service Provider is concerned about safeguarding the confidentiality of your information. The Service Provider provides physical, electronic, and procedural safeguards to protect information the Service Provider processes and maintains.
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <h2 className="text-2xl font-bold text-foreground">Changes</h2>
                                    <p className="leading-relaxed">
                                        This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify you of any changes to the Privacy Policy by updating this page with the new Privacy Policy. You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes.
                                    </p>
                                    <p className="font-semibold text-primary">
                                        This privacy policy is effective as of 2026-01-01
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <h2 className="text-2xl font-bold text-foreground">Your Consent</h2>
                                    <p className="leading-relaxed">
                                        By using the Application, you are consenting to the processing of your information as set forth in this Privacy Policy now and as amended by us.
                                    </p>
                                </section>

                                <section className="bg-secondary/30 p-6 rounded-xl border border-border/50">
                                    <div className="flex items-center gap-2 text-primary mb-4">
                                        <Mail className="w-6 h-6" />
                                        <h2 className="text-2xl font-bold m-0 text-foreground">Contact Us</h2>
                                    </div>
                                    <p className="leading-relaxed">
                                        If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service Provider via email at <a href="mailto:askeva.apps@gmail.com" className="text-primary hover:underline font-medium">askeva.apps@gmail.com</a>.
                                    </p>
                                </section>
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <div className="p-6 border-t border-border/50 text-center text-muted-foreground text-sm">
                        © {new Date().getFullYear()} ASK EVA. All rights reserved.
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
