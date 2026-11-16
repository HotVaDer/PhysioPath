// The old «Η κλινική σας είναι έτοιμη» page. Sign-up now ends on the home page («Καλώς ήρθατε»),
// so old links and bookmarks go there.
import { redirect } from "next/navigation";

export default function DonePage() {
  redirect("/");
}
