/*
 * WORK-STORE-MEASURE · 度量二：whole-envelope 原子替换 CAS 的系统调用级延迟。
 *
 * 不实现 WORK-STORE-1；只在真机 APFS 上度量「同目录临时文件 → 落盘 → rename → 目录项落盘」
 * 这套原子替换在四种落盘原语下的每次延迟：
 *   none    ：只 write + rename（页缓存，无耐久保证）——基线
 *   fsync   ：fsync(2)。注意 Apple 的 fsync 不保证刷到介质（见 fsync(2) man）
 *   barrier ：fcntl(F_BARRIERFSYNC)——发屏障，弱于 full
 *   full    ：fcntl(F_FULLFSYNC)——fsync + 要求盘刷到介质（ADR-010 要求的强同步）
 * 对文件与父目录都施加所选原语（目录项耐久）；目录 fd 不支持该 fcntl 时回退 fsync 并标注。
 *
 * 这度量的是 WORK-STORE-1 的 Rust host 每次 CAS 要真实付出的耐久成本。Node 的 fsyncSync 在
 * macOS 上已映射到 F_FULLFSYNC，无法单独度量「不加 full 的差」，故此处用 C 直接调系统调用。
 *
 * 编译：clang -O2 -o cas-latency cas-latency.c
 * 运行：./cas-latency [target_dir] [iterations]
 */
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <errno.h>
#include <sys/stat.h>

enum sync_mode { MODE_NONE = 0, MODE_FSYNC = 1, MODE_BARRIER = 2, MODE_FULL = 3 };
static const char *mode_name[] = {"none", "fsync", "barrier", "full(F_FULLFSYNC)"};

/* 对 fd 施加所选耐久原语；返回 0 成功，非 0 为 errno。fell_back 标记 fcntl 回退到 fsync。 */
static int durable(int fd, enum sync_mode mode, int *fell_back) {
  switch (mode) {
    case MODE_NONE:
      return 0;
    case MODE_FSYNC:
      return fsync(fd) == 0 ? 0 : errno;
    case MODE_BARRIER:
      if (fcntl(fd, F_BARRIERFSYNC) == 0) return 0;
      if (fell_back) *fell_back = 1;
      return fsync(fd) == 0 ? 0 : errno;
    case MODE_FULL:
      if (fcntl(fd, F_FULLFSYNC) == 0) return 0;
      if (fell_back) *fell_back = 1;
      return fsync(fd) == 0 ? 0 : errno;
  }
  return EINVAL;
}

static double now_ms(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return ts.tv_sec * 1000.0 + ts.tv_nsec / 1.0e6;
}

/* 一次原子替换 CAS。返回耗时毫秒；失败返回 -1。 */
static double one_cas(const char *dir, const char *target, const char *tmp,
                      const char *buf, size_t len, enum sync_mode mode, int *fell_back) {
  double t0 = now_ms();
  int fd = open(tmp, O_CREAT | O_WRONLY | O_TRUNC, 0644);
  if (fd < 0) return -1;
  size_t off = 0;
  while (off < len) {
    ssize_t w = write(fd, buf + off, len - off);
    if (w < 0) { close(fd); return -1; }
    off += (size_t)w;
  }
  if (durable(fd, mode, fell_back) != 0) { close(fd); return -1; }
  if (close(fd) != 0) return -1;
  if (rename(tmp, target) != 0) return -1;
  /* 目录项落盘：rename 的耐久需父目录同步。 */
  if (mode != MODE_NONE) {
    int dfd = open(dir, O_RDONLY);
    if (dfd < 0) return -1;
    if (durable(dfd, mode, fell_back) != 0) { close(dfd); return -1; }
    close(dfd);
  }
  return now_ms() - t0;
}

static int cmp_double(const void *a, const void *b) {
  double x = *(const double *)a, y = *(const double *)b;
  return (x > y) - (x < y);
}

static double pct(double *sorted, int n, double p) {
  if (n == 0) return 0;
  int rank = (int)(p / 100.0 * n) - 1;
  if (rank < 0) rank = 0;
  if (rank >= n) rank = n - 1;
  return sorted[rank];
}

int main(int argc, char **argv) {
  char dir_template[] = "/tmp/courtwork-cas-latency-XXXXXX";
  const char *dir;
  char owned_dir[256];
  if (argc >= 2) {
    dir = argv[1];
    if (mkdir(dir, 0755) != 0 && errno != EEXIST) { perror("mkdir target"); return 1; }
  } else {
    if (!mkdtemp(dir_template)) { perror("mkdtemp"); return 1; }
    strncpy(owned_dir, dir_template, sizeof(owned_dir) - 1);
    dir = owned_dir;
  }
  int iters = argc >= 3 ? atoi(argv[2]) : 200;
  if (iters < 10) iters = 10;

  size_t sizes[] = {36 * 1024, 256 * 1024, 1024 * 1024};
  int n_sizes = 3;
  enum sync_mode modes[] = {MODE_NONE, MODE_FSYNC, MODE_BARRIER, MODE_FULL};
  int n_modes = 4;

  size_t max_size = sizes[n_sizes - 1];
  char *buf = malloc(max_size);
  if (!buf) { perror("malloc"); return 1; }
  memset(buf, 'E', max_size);

  char target[512], tmp[512];
  snprintf(target, sizeof(target), "%s/envelope.json", dir);
  snprintf(tmp, sizeof(tmp), "%s/envelope.json.tmp", dir);

  double *samples = malloc(sizeof(double) * iters);
  if (!samples) { perror("malloc samples"); return 1; }

  printf("==== WORK-STORE-MEASURE · 度量二：原子替换 CAS 系统调用级延迟（APFS 真机）====\n");
  printf("target dir: %s   iterations/组: %d   warmup: 5\n", dir, iters);
  printf("每次 = open+write(payload)+durable(file)+close+rename+durable(dir)\n\n");
  printf("%-8s %-18s %9s %9s %9s %9s %9s\n", "size", "mode", "min", "p50", "p95", "max", "mean(ms)");
  printf("---------------------------------------------------------------------------------\n");

  for (int si = 0; si < n_sizes; si++) {
    for (int mi = 0; mi < n_modes; mi++) {
      int fell_back = 0;
      /* warmup */
      for (int w = 0; w < 5; w++) one_cas(dir, target, tmp, buf, sizes[si], modes[mi], &fell_back);
      int ok = 0;
      double total = 0;
      for (int i = 0; i < iters; i++) {
        double ms = one_cas(dir, target, tmp, buf, sizes[si], modes[mi], &fell_back);
        if (ms < 0) { fprintf(stderr, "CAS failed (errno=%d)\n", errno); free(buf); free(samples); return 1; }
        samples[ok++] = ms;
        total += ms;
      }
      qsort(samples, ok, sizeof(double), cmp_double);
      char sizelabel[16];
      snprintf(sizelabel, sizeof(sizelabel), "%zuKiB", sizes[si] / 1024);
      printf("%-8s %-18s %9.4f %9.4f %9.4f %9.4f %9.4f%s\n",
             sizelabel, mode_name[modes[mi]],
             samples[0], pct(samples, ok, 50), pct(samples, ok, 95), samples[ok - 1], total / ok,
             fell_back ? "  [dir fcntl→fsync 回退]" : "");
    }
    printf("\n");
  }

  free(buf);
  free(samples);
  unlink(target);
  unlink(tmp);
  return 0;
}
