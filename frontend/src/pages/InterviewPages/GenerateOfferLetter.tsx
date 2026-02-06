import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const GenerateOfferLetter = () => {
  const [emailMethod, setEmailMethod] = useState("without-esign");

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">Offer Letter</h1>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">Edit Page Layout</Button>
              <Button variant="outline" className="w-full sm:w-auto">Help</Button>
            </div>
          </div>

          {/* Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You can generate maximum of 1000 (Available: 1000) offers per month. If you want to increase the limit, please click here to purchase.
              <br />
              Offer status will be changed to <strong>Offer revised</strong> upon offer updation until it's sent to Candidate
            </AlertDescription>
          </Alert>

          {/* Offer Template */}
          <Card>
            <CardHeader>
              <CardTitle>Offer Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="offer-template">Choose Offer Template</Label>
                <Select defaultValue="employment">
                  <SelectTrigger id="offer-template">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employment">Offer of Employment.docx</SelectItem>
                    <SelectItem value="contract">Contract Template.docx</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Email Sending */}
          <Card>
            <CardHeader>
              <CardTitle>Email Sending Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={emailMethod} onValueChange={setEmailMethod}>
                <div className="space-y-4">

                  {/* Without Esign */}
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="without-esign" id="without-esign" />
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="without-esign" className="font-semibold">Without e-sign</Label>
                      <p className="text-sm text-muted-foreground">
                        Sent as a link via email. The candidate can accept or reject through the email link.
                      </p>

                      {/* Conditional Template */}
                      {emailMethod === "without-esign" && (
                        <div className="space-y-2 mt-4">
                          <Label htmlFor="email-template">Choose Email Template</Label>
                          <Select defaultValue="contract">
                            <SelectTrigger id="email-template">
                              <SelectValue placeholder="Select email template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contract">Offer of Contract</SelectItem>
                              <SelectItem value="employment">Offer of Employment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* With Esign */}
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="with-esign" id="with-esign" />
                    <div>
                      <Label htmlFor="with-esign" className="font-semibold">With e-sign</Label>
                      <p className="text-sm text-muted-foreground">
                        Sent as an email attachment with e-signature to recipients.
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="posting-title">Posting Title *</Label>
                  <Input id="posting-title" placeholder="Select posting title" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department Name *</Label>
                  <Input id="department" placeholder="Select department" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="candidate-name">Candidate Name *</Label>
                <Input id="candidate-name" placeholder="Select candidate" />
              </div>
            </CardContent>
          </Card>

          {/* Employment Info */}
          <Card>
            <CardHeader>
              <CardTitle>Employment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="compensation">Compensation Amount ($ / Per Month)</Label>
                  <Input id="compensation" type="number" placeholder="Enter amount" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employment-type">Employment Type</Label>
                  <Select defaultValue="permanent">
                    <SelectTrigger id="employment-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="joining-date">Expected Joining Date</Label>
                  <Input id="joining-date" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer-owner">Offer Owner</Label>
                  <Select defaultValue="boominathan">
                    <SelectTrigger id="offer-owner">
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boominathan">Boominathan M</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Other Information */}
          <Card>
            <CardHeader>
              <CardTitle>Other Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="expiry-date">Expiry Date *</Label>
                <Input id="expiry-date" type="date" />
              </div>
            </CardContent>
          </Card>

          {/* Footer Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-4">
            <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            <Button variant="outline" className="w-full sm:w-auto">Preview Offer Letter</Button>
            <Button className="w-full sm:w-auto">Save and Next</Button>
          </div>

        </div>
      </main>
    </MainLayout>
  );
};

export default GenerateOfferLetter;
