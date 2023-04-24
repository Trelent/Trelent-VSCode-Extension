import packageData from "../package.json";
import Accordion from "./components/Accordion";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";

const autoModeExample = `def maintained(): # @trelent-auto
  """
  This function will have its docstring kept
  up to date automatically!
  """
  print("A utopian world")`;

const highlightPerFunctionExample = `def highlighted(): # @trelent-highlight
  """This function will be highlighted!"""
  print("A pleasant world")`;

const disablePerFunctionExample = `def disabled(): # @trelent-disable
  """
  This function will never be highlighted
  nor have its docstring updated.
  """
  print("A bleak world")`;

const theme = vs2015;

const GettingStarted = () => {
  return (
    <p className="text-base text-gray-200">
      Let&apos;s get you documenting your code! First up, get a Python or
      JavaScript file ready in your editor. Then, click on a function you want
      to document!
      <br />
      <br />
      Now, just press
      <code className="bg-slate-700 p-1 mx-1 rounded">Alt + D</code> or
      <code className="bg-slate-700 p-1 pl-2 mx-1 rounded">⌘ + D</code>
      on a Mac.
      <br />
      <br />
      Next, let's configure Autodoc to automatically update your docstrings!
      Find the
      <code className="bg-slate-700 p-1 pl-2 mx-2 rounded">
        trelent.autodoc.mode
      </code>
      setting in your VS Code configuration, and change it to
      <code className="bg-slate-700 p-1 pl-2 ml-2 rounded">
        "Maintain Docstrings"
      </code>
      . Now, whenever we detect a substantial code change, we'll automatically
      update your docstrings for you!
      <br />
      <br />
      To find this page again, you may run the
      <code className="bg-slate-700 p-1 pl-2 mx-2 rounded">Trelent: Help</code>
      command from the Command Palette.
      <br />
      <br />
      We also roughly estimate how much of your code is documented! Just check
      out the status bar at the bottom of the editor once you open a supported
      file type!
      <br />
    </p>
  );
};

const UsingAutodoc = () => {
  return (
    <div>
      <p className="text-base text-gray-200">
        Autodoc simplifies code documentation by automatically keeping
        docstrings updated, or highlighting the function they belong to when
        they become outdated. This helps you easily maintain clear, accurate
        documentation. The Autodoc feature has three modes: Highlight
        Per-Function, Highlight Globally, and Maintain Docstrings.
      </p>

      <h4 className="mt-3 text-lg text-white font-bold">
        Highlight Per-Function
      </h4>
      <p className="text-base text-gray-200">
        This mode highlights functions marked with the "@trelent-highlight" tag
        that have outdated docstrings. Functions marked with the "@trelent-auto"
        tag will have their docstrings automatically updated.
      </p>

      <h4 className="mt-3 text-lg text-white font-bold">Highlight Globally</h4>
      <p className="text-base text-gray-200">
        This mode highlights all functions with outdated docstrings, except
        those with the "@trelent-ignore" tag. Functions marked with the
        "@trelent-auto" tag will have their docstrings automatically updated.
      </p>

      <h4 className="mt-3 text-lg text-white font-bold">Maintain Docstrings</h4>
      <p className="text-base text-gray-200">
        This mode automatically updates all outdated docstrings, except those
        with the "@trelent-ignore" or "@trelent-highlight" tags.
      </p>

      <p className="text-base text-gray-200 sm:mt-5">
        You can configure the Autodoc mode and other settings in the VSCode
        extension settings.
      </p>

      <h3 className="mt-3 text-lg text-white font-bold">Tag Examples</h3>
      <p className="text-base text-gray-200">
        Here are some examples of how to use the Autodoc tags. Note the tags in
        green on the same line as the function definition.
      </p>
      <h5 className="text-white font-bold mt-3">@trelent-auto</h5>
      <SyntaxHighlighter
        language="python"
        style={theme}
        showInlineLineNumbers={false}
      >
        {autoModeExample}
      </SyntaxHighlighter>
      <h5 className="text-white font-bold mt-3">@trelent-highlight</h5>
      <SyntaxHighlighter
        language="python"
        style={theme}
        showInlineLineNumbers={false}
      >
        {highlightPerFunctionExample}
      </SyntaxHighlighter>
      <h5 className="text-white font-bold mt-3">@trelent-disable</h5>
      <SyntaxHighlighter
        language="python"
        style={theme}
        showInlineLineNumbers={false}
      >
        {disablePerFunctionExample}
      </SyntaxHighlighter>
    </div>
  );
};

const WhatsNext = () => {
  return (
    <div>
      <p className="text-base text-gray-200">
        We're continuously working on improving Trelent and adding more
        features. Keep an eye on our updates and release notes to stay informed
        about the latest enhancements and changes.
      </p>
      <p className="mt-3 text-base text-gray-200">
        If you have any suggestions or feedback, don't hesitate to reach out to
        us. We appreciate your support and are eager to make Trelent the best
        documentation tool for developers!
      </p>
    </div>
  );
};

export default function app() {
  return (
    <div
      className="relative overflow-x-hidden bg-gray-800"
      style={{ height: "100vh" }}
    >
      <div className="relative pb-8 sm:pb-16">
        <h1 className="text-4xl sm:text-5xl md:text-6xl ml-5 font-bold mt-5 text-center text-white">
          Welcome to Trelent
        </h1>
        <div className="grid grid-cols-1 gap-4 mx-auto max-w-4xl">
          <Accordion
            defaultOpen={true}
            content={<GettingStarted />}
            title="Getting Started"
          />
          <Accordion
            defaultOpen={true}
            content={<UsingAutodoc />}
            title="Using Autodoc"
          />
          <Accordion
            defaultOpen={true}
            content={<WhatsNext />}
            title="What's Next"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 mx-auto max-w-4xl">
          <div className="relative flex flex-col items-center justify-center w-full h-full p-4 text-left bg-gray-800 sm:p-8">
            <p className="text-center text-white">
              Join our{" "}
              <a className="underline" href="https://discord.gg/trelent">
                Discord community
              </a>{" "}
              to help shape the future of Trelent!
              <br />
              <br />
              Version:
              <code className="bg-slate-700 p-1 mx-1 rounded">
                {packageData.version}
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
