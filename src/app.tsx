export default function app() {
  return (
    <div
      className="relative overflow-hidden bg-gray-800"
      style={{ height: "100vh" }}
    >
      <div className="relative pt-6 pb-16 sm:pb-24">
        <main className="mt-16 sm:mt-24">
          <div className="mx-auto max-w-7xl">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <div className="px-4 sm:px-6 sm:text-center md:mx-auto md:max-w-2xl lg:col-span-12 lg:flex lg:items-center lg:text-left">
                <div>
                  <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl md:text-6xl">
                    Welcome to Trelent
                  </h1>
                  <p className="mt-3 text-base text-gray-300 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                    Let&apos;s get you documenting your code!
                    <br />
                    <br />
                    First up, get a Python or JavaScript file ready in your
                    editor.
                    <br />
                    <br />
                    Then, click on a function you want to document!
                    <br />
                    <br />
                    Now, just press
                    <code className="bg-slate-700 p-1 mx-1 rounded">
                      Alt + D
                    </code>{" "}
                    or
                    <code className="bg-slate-700 p-1 mx-1 rounded">
                      Cmd + D
                    </code>
                    on a Mac.
                    <br />
                    <br />
                    You can also use the
                    <code className="bg-slate-700 p-1 mx-2 rounded">
                      Trelent: Write Docstring
                    </code>
                    command in the Command Palette.
                    <br />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
