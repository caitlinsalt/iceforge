---
title: Code Syntax Highlighting
author: caitlin
date: 2024-04-03 21:26:00
categories: [ About Iceforge ]
template: article.pug
---

The default Markdown template uses [highlight.js](https://highlightjs.org/) for syntax highlighting in code blocks.  Highlight.js comes supplied with many themes.  This blog template includes the "VS" theme, but you can download any of [the theme files from GitHub](https://github.com/highlightjs/cdn-release/tree/11-stable/build/styles) and use them for a different look; or [the highlight.js documentation](https://highlightjs.readthedocs.io/en/latest/) explains which classes to define in your own CSS.

<span class="more"></span>

### JavaScript

```javascript
function getRandomNumber() {
    return 4; // chosen by fair dice roll.
              // guaranteed to be random.
}
```

### CoffeeScript

```coffeescript
class Biscuit
  eat: ->
    print 'om nom nom'
    while true
      sleep 1

class RichTea extends Biscuit
  dunkInTea: ->
    print 'oh no, it collapsed'
```

### C

```c
#include <stdio.h>

int main(void)
{
  printf("Hello world\n");
  return 0;
}
```

### C++

```cpp
#include <iostream>

int main()
{
  std::cout << "Hello World!" << std::endl;
  return 0;
}
```

### C#

```cs
using System;
namespace Example;
public static class Program
{
    static void Main()
    {
        Console.WriteLine("Hello, world!");
    }
}
```

### Erlang

```erlang
io:format("~s~n", ["hello, world"])
```

### Go

```go
package main

import "fmt"

func main() {
   fmt.Println("Hello World!")
}
```

### Java

```java
public class HelloWorld {
   public static void main(String[] args) {
       System.out.println("Hello world!");
   }
}
```

### ObjectiveC

```objectivec
#import <stdio.h>

int main(void)
{
    printf("Hello, World!\n");
    return 0;
}
```

### PHP

```php
<?php echo 'Hello, world'; ?>
```

### Python

```python
print("Hello World")
```

### Ruby

```ruby
puts "Hello world!"
```
