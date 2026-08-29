export default {
  async fetch(): Promise<Response> { return new Response("x-downloader"); },
} satisfies ExportedHandler;
